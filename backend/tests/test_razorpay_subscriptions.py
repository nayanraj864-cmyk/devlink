import hmac
import hashlib
import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.dependencies import get_database
from app.main import app
from app.models.user import User
from app.core.security import create_access_token
from app.routers.razorpay import RAZORPAY_KEY_SECRET

# SQLite setup for tests
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_database] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def _create_user(db, email: str = "razorpay@devlink.io", username: str = "razoruser") -> User:
    user = User(
        email=email,
        username=username,
        first_name="Razorpay",
        last_name="User",
        password_hash="fakehash",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_get_razorpay_plans():
    client = TestClient(app)
    db = TestingSessionLocal()
    user = _create_user(db)
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"}

    response = client.get("/api/razorpay/plans", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "plans" in data
    assert len(data["plans"]) >= 3
    plan_ids = [p["id"] for p in data["plans"]]
    assert "plan_pro_monthly" in plan_ids
    assert "plan_pro_yearly" in plan_ids
    assert "plan_teams_monthly" in plan_ids

def test_create_razorpay_subscription_success():
    client = TestClient(app)
    db = TestingSessionLocal()
    user = _create_user(db)
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"}

    payload = {
        "plan_id": "plan_pro_monthly",
        "customer_name": "Sarah Chen",
        "customer_email": "sarah@devlink.io",
        "customer_phone": "+919876543210"
    }
    response = client.post("/api/razorpay/create-subscription", headers=headers, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "created"
    assert data["subscription_id"].startswith("sub_rzp_")
    assert data["currency"] == "INR"
    assert data["amount"] == 99900
    assert data["key_id"] == "rzp_test_devlink2026"

def test_create_razorpay_subscription_invalid_plan():
    client = TestClient(app)
    db = TestingSessionLocal()
    user = _create_user(db)
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"}

    payload = {
        "plan_id": "invalid_plan_123",
    }
    response = client.post("/api/razorpay/create-subscription", headers=headers, json=payload)
    assert response.status_code == 404

def test_verify_razorpay_payment_valid_signature():
    client = TestClient(app)
    db = TestingSessionLocal()
    user = _create_user(db)
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"}

    payment_id = "pay_K123456789"
    subscription_id = "sub_K987654321"
    
    # Generate valid HMAC SHA256 signature
    msg = f"{payment_id}|{subscription_id}".encode("utf-8")
    valid_sig = hmac.new(RAZORPAY_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    payload = {
        "razorpay_payment_id": payment_id,
        "razorpay_subscription_id": subscription_id,
        "razorpay_signature": valid_sig
    }
    response = client.post("/api/razorpay/verify-payment", headers=headers, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "verified"
    assert data["payment_id"] == payment_id

def test_verify_razorpay_payment_invalid_signature():
    client = TestClient(app)
    db = TestingSessionLocal()
    user = _create_user(db)
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"}

    payload = {
        "razorpay_payment_id": "pay_K123456789",
        "razorpay_subscription_id": "sub_K987654321",
        "razorpay_signature": "invalid_tampered_signature_12345"
    }
    response = client.post("/api/razorpay/verify-payment", headers=headers, json=payload)
    assert response.status_code == 400
    assert "verification failed" in response.json()["detail"].lower()

def test_razorpay_webhook_event_processing():
    client = TestClient(app)
    db = TestingSessionLocal()
    user = _create_user(db)
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"}

    webhook_payload = {
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_K987654321",
                    "plan_id": "plan_pro_monthly",
                    "status": "active"
                }
            }
        }
    }
    response = client.post("/api/razorpay/webhook", headers=headers, json=webhook_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["event"] == "subscription.activated"
