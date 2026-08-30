from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.models.refresh_token import RefreshToken
from app.core.config import settings

from tests.conftest import TestingSessionLocal


ORIGIN = settings.cors_origins[0]


def _register_user(client: TestClient, email: str, username: str):
    return client.post(
        "/api/auth/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": email,
            "username": username,
            "password": "Vermilion-Kestrel97!",
        },
        headers={"origin": ORIGIN},
    )


def test_login_creates_refresh_token_in_db():
    client = TestClient(app)
    _register_user(client, "login_test@example.com", "logintestuser")

    res = client.post(
        "/api/auth/login",
        json={"email": "login_test@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"User-Agent": "Pytest-Client", "origin": ORIGIN},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data

    # Verify session in DB
    db = TestingSessionLocal()
    tokens = db.query(RefreshToken).all()
    assert len(tokens) >= 1
    assert tokens[-1].is_revoked is False
    db.close()


def test_refresh_token_rotation():
    client = TestClient(app)
    _register_user(client, "rotate_test@example.com", "rotatetestuser")

    login_res = client.post(
        "/api/auth/login",
        json={"email": "rotate_test@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    old_refresh_token = login_res.json()["refresh_token"]

    # Rotate token
    ref_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": old_refresh_token},
        headers={"origin": ORIGIN},
    )
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    new_refresh_token = ref_data["refresh_token"]

    assert new_refresh_token != old_refresh_token

    # Verify old token is marked revoked in DB
    db = TestingSessionLocal()
    old_token_record = (
        db.query(RefreshToken).filter(RefreshToken.token == old_refresh_token).first()
    )
    assert old_token_record is not None
    assert old_token_record.is_revoked is True
    db.close()


def test_refresh_token_reuse_prevention():
    client = TestClient(app)
    _register_user(client, "reuse_test@example.com", "reusetestuser")

    login_res = client.post(
        "/api/auth/login",
        json={"email": "reuse_test@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    initial_refresh_token = login_res.json()["refresh_token"]

    # Legitimate first refresh
    ref_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": initial_refresh_token},
        headers={"origin": ORIGIN},
    )
    assert ref_res.status_code == 200
    valid_new_token = ref_res.json()["refresh_token"]

    # Attacker/reused attempt with initial_refresh_token
    reuse_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": initial_refresh_token},
        headers={"origin": ORIGIN},
    )
    assert reuse_res.status_code == 401

    # Attempting to use even valid_new_token should now fail because reuse revoked ALL user tokens
    second_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": valid_new_token},
        headers={"origin": ORIGIN},
    )
    assert second_res.status_code == 401


def test_get_active_sessions():
    client = TestClient(app)
    _register_user(client, "sessions_test@example.com", "sessionstestuser")

    login_res = client.post(
        "/api/auth/login",
        json={"email": "sessions_test@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}", "origin": ORIGIN}

    res = client.get("/api/auth/sessions", headers=headers)
    assert res.status_code == 200
    sessions = res.json()
    assert len(sessions) >= 1
    assert "id" in sessions[0]


def test_revoke_individual_session():
    client = TestClient(app)
    _register_user(client, "revonesess@example.com", "revonesessuser")

    login_res = client.post(
        "/api/auth/login",
        json={"email": "revonesess@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}", "origin": ORIGIN}

    sessions_res = client.get("/api/auth/sessions", headers=headers)
    session_id = sessions_res.json()[0]["id"]

    del_res = client.delete(f"/api/auth/sessions/{session_id}", headers=headers)
    assert del_res.status_code == 200

    sessions_after = client.get("/api/auth/sessions", headers=headers).json()
    assert len(sessions_after) == 0


def test_revoke_all_sessions():
    client = TestClient(app)
    _register_user(client, "revall@example.com", "revalluser")

    login_res1 = client.post(
        "/api/auth/login",
        json={"email": "revall@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    login_res2 = client.post(
        "/api/auth/login",
        json={"email": "revall@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    access_token = login_res2.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}", "origin": ORIGIN}

    # Before revoke, 2 active sessions
    active_before = client.get("/api/auth/sessions", headers=headers).json()
    assert len(active_before) == 2

    # Logout all
    logout_all_res = client.post("/api/auth/logout-all", headers=headers)
    assert logout_all_res.status_code == 200

    # After logout all, 0 active sessions
    active_after = client.get("/api/auth/sessions", headers=headers).json()
    assert len(active_after) == 0


def test_logout_without_refresh_token_revokes_all_tokens():
    """
    Test that logging out without providing a refresh token (typical client behavior)
    still revokes all refresh tokens for the user.
    This prevents token replay attacks where an intercepted refresh token
    could be used after logout.
    """
    client = TestClient(app)
    _register_user(client, "logout_no_token@example.com", "logoutnotoken")

    # Login to get tokens
    login_res = client.post(
        "/api/auth/login",
        json={"email": "logout_no_token@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    access_token = data["access_token"]
    refresh_token = data["refresh_token"]
    headers = {"Authorization": f"Bearer {access_token}", "origin": ORIGIN}

    # Verify session exists
    db = TestingSessionLocal()
    tokens_before = db.query(RefreshToken).filter(RefreshToken.user_id == data["user"]["id"]).all()
    assert len(tokens_before) == 1
    assert tokens_before[0].is_revoked is False
    db.close()

    # Logout WITHOUT providing refresh token (typical client behavior)
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Verify all tokens are revoked
    db = TestingSessionLocal()
    tokens_after = db.query(RefreshToken).filter(RefreshToken.user_id == data["user"]["id"]).all()
    assert len(tokens_after) == 1
    assert tokens_after[0].is_revoked is True
    db.close()

    # Attempting to use the refresh token should fail
    reuse_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
        headers={"origin": ORIGIN},
    )
    assert reuse_res.status_code == 401
    assert "revoked" in reuse_res.json()["detail"].lower()


def test_logout_with_refresh_token_revokes_only_that_token():
    """
    Test that logging out WITH a refresh token revokes only that specific token.
    This is useful when a user wants to logout from one device while keeping others.
    """
    client = TestClient(app)
    _register_user(client, "logout_with_token@example.com", "logoutwithtoken")

    # Login twice to create two sessions
    login_res1 = client.post(
        "/api/auth/login",
        json={"email": "logout_with_token@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    login_res2 = client.post(
        "/api/auth/login",
        json={"email": "logout_with_token@example.com", "password": "Vermilion-Kestrel97!"},
        headers={"origin": ORIGIN},
    )
    refresh_token1 = login_res1.json()["refresh_token"]
    refresh_token2 = login_res2.json()["refresh_token"]
    access_token2 = login_res2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {access_token2}", "origin": ORIGIN}

    # Verify two sessions exist
    db = TestingSessionLocal()
    tokens_before = db.query(RefreshToken).filter(RefreshToken.user_id == login_res1.json()["user"]["id"]).all()
    assert len(tokens_before) == 2
    db.close()

    # Logout with specific refresh token (from first login)
    logout_res = client.post(
        "/api/auth/logout",
        json={"refresh_token": refresh_token1},
        headers=headers2,
    )
    assert logout_res.status_code == 200

    # Verify only the first token is revoked
    db = TestingSessionLocal()
    token1 = db.query(RefreshToken).filter(RefreshToken.token == refresh_token1).first()
    token2 = db.query(RefreshToken).filter(RefreshToken.token == refresh_token2).first()
    assert token1.is_revoked is True
    assert token2.is_revoked is False
    db.close()

    # refresh_token2 should still work for refresh
    refresh_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token2},
        headers={"origin": ORIGIN},
    )
    assert refresh_res.status_code == 200
