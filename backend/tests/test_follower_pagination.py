from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.dependencies import get_database
from app.main import app
from app.models.follower import Follower
from app.models.user import User
from app.services.follower_service import FollowerService

# SQLite in-memory configuration
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


def _create_user(db, username: str, email: str) -> User:
    u = User(
        id=uuid.uuid4(),
        username=username,
        email=email,
        password_hash="fake_hash",
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


# ---------------------------------------------------------------------
# Service Unit Tests for Follower Pagination
# ---------------------------------------------------------------------


def test_list_followers_paginated_empty():
    db = TestingSessionLocal()
    user = _create_user(db, "target_empty", "target_empty@example.com")

    items, total, pages, has_next, has_prev = (
        FollowerService.list_followers_paginated(
            db=db,
            user_id=user.id,
            page=1,
            limit=10,
        )
    )
    assert items == []
    assert total == 0
    assert pages == 1
    assert has_next is False
    assert has_prev is False
    db.close()


def test_list_followers_paginated_multi_pages():
    db = TestingSessionLocal()
    target = _create_user(db, "celebrity_dev", "celeb@example.com")

    # Create 25 followers
    followers = []
    for i in range(25):
        f = _create_user(db, f"follower_{i:02d}", f"f_{i:02d}@example.com")
        followers.append(f)
        FollowerService.follow_user(db, follower_id=f.id, following_id=target.id)

    # Page 1 with limit 10
    p1_items, total, pages, has_next, has_prev = (
        FollowerService.list_followers_paginated(
            db=db,
            user_id=target.id,
            page=1,
            limit=10,
        )
    )
    assert len(p1_items) == 10
    assert total == 25
    assert pages == 3
    assert has_next is True
    assert has_prev is False

    # Page 2 with limit 10
    p2_items, total, pages, has_next, has_prev = (
        FollowerService.list_followers_paginated(
            db=db,
            user_id=target.id,
            page=2,
            limit=10,
        )
    )
    assert len(p2_items) == 10
    assert total == 25
    assert pages == 3
    assert has_next is True
    assert has_prev is True

    # Page 3 with limit 10 (last page with 5 items)
    p3_items, total, pages, has_next, has_prev = (
        FollowerService.list_followers_paginated(
            db=db,
            user_id=target.id,
            page=3,
            limit=10,
        )
    )
    assert len(p3_items) == 5
    assert total == 25
    assert pages == 3
    assert has_next is False
    assert has_prev is True

    # Verify no item overlap across pages
    p1_ids = {item.follower_id for item in p1_items}
    p2_ids = {item.follower_id for item in p2_items}
    p3_ids = {item.follower_id for item in p3_items}
    assert len(p1_ids.intersection(p2_ids)) == 0
    assert len(p2_ids.intersection(p3_ids)) == 0
    assert len(p1_ids.union(p2_ids).union(p3_ids)) == 25
    db.close()


def test_list_following_paginated_large_dataset():
    db = TestingSessionLocal()
    actor = _create_user(db, "active_scout", "scout@example.com")

    # Follow 65 users
    targets = []
    for i in range(65):
        t = _create_user(db, f"target_dev_{i:02d}", f"t_{i:02d}@example.com")
        targets.append(t)
        FollowerService.follow_user(db, follower_id=actor.id, following_id=t.id)

    # Page 1 limit 20
    items, total, pages, has_next, has_prev = (
        FollowerService.list_following_paginated(
            db=db,
            user_id=actor.id,
            page=1,
            limit=20,
        )
    )
    assert len(items) == 20
    assert total == 65
    assert pages == 4
    assert has_next is True
    assert has_prev is False

    # Page 4 limit 20 (last page with 5 items)
    p4_items, _, _, p4_next, p4_prev = FollowerService.list_following_paginated(
        db=db,
        user_id=actor.id,
        page=4,
        limit=20,
    )
    assert len(p4_items) == 5
    assert p4_next is False
    assert p4_prev is True
    db.close()


# ---------------------------------------------------------------------
# API Integration Tests for Follower Pagination
# ---------------------------------------------------------------------


def test_api_user_followers_with_pagination():
    client = TestClient(app)
    db = TestingSessionLocal()
    target = _create_user(db, "api_target", "api_target@example.com")

    for i in range(15):
        f = _create_user(db, f"api_follower_{i}", f"api_f_{i}@example.com")
        FollowerService.follow_user(db, follower_id=f.id, following_id=target.id)
    db.close()

    # Query with page and limit
    res = client.get(f"/api/followers/{target.id}?page=1&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) == 5
    assert data["total"] == 15
    assert data["page"] == 1
    assert data["limit"] == 5
    assert data["pages"] == 3
    assert data["has_next"] is True
    assert data["has_prev"] is False

    # Query page 3
    res_p3 = client.get(f"/api/followers/{target.id}?page=3&limit=5")
    assert res_p3.status_code == 200
    data_p3 = res_p3.json()
    assert len(data_p3["items"]) == 5
    assert data_p3["has_next"] is False
    assert data_p3["has_prev"] is True


def test_api_user_following_with_pagination():
    client = TestClient(app)
    db = TestingSessionLocal()
    actor = _create_user(db, "api_follower_user", "api_user@example.com")

    for i in range(12):
        t = _create_user(db, f"api_following_target_{i}", f"api_t_{i}@example.com")
        FollowerService.follow_user(db, follower_id=actor.id, following_id=t.id)
    db.close()

    # Query with pagination
    res = client.get(f"/api/followers/{actor.id}/following?page=1&limit=8")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 8
    assert data["total"] == 12
    assert data["pages"] == 2
    assert data["has_next"] is True
    assert data["has_prev"] is False


def test_api_backward_compatibility_without_pagination_params():
    client = TestClient(app)
    db = TestingSessionLocal()
    target = _create_user(db, "compat_target", "compat@example.com")

    for i in range(3):
        f = _create_user(db, f"compat_follower_{i}", f"compat_f_{i}@example.com")
        FollowerService.follow_user(db, follower_id=f.id, following_id=target.id)
    db.close()

    # Query without params returns flat list for backward compatibility
    res = client.get(f"/api/followers/{target.id}")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 3
