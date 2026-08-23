"""Tests for the advanced messaging features (issue #973).

Covers message scheduling, pinning, edit/delete authorization, the VOICE
message type, and global message search.
"""

import uuid
from datetime import timedelta

import pytest
from app.models.conversation import Conversation, ConversationType
from app.models.conversation_member import ConversationMember
from app.utils.time import utcnow
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture
def test_conversation(db: Session, register_and_login):
    uid1, token1 = register_and_login("advmsg1@example.com", "advmsg1")
    uid2, token2 = register_and_login("advmsg2@example.com", "advmsg2")

    conv = Conversation(
        title="Test Chat", type=ConversationType.DIRECT, created_by=uuid.UUID(uid1)
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    m1 = ConversationMember(conversation_id=conv.id, user_id=uuid.UUID(uid1))
    m2 = ConversationMember(conversation_id=conv.id, user_id=uuid.UUID(uid2))
    db.add(m1)
    db.add(m2)
    db.commit()

    return {"id": conv.id, "u1": uid1, "token1": token1, "u2": uid2, "token2": token2}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------
# Message scheduling
# ------------------------------------------------------------------


def test_schedule_message_hidden_from_thread(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]
    future = (utcnow() + timedelta(hours=2)).isoformat()

    response = client.post(
        "/api/messages/",
        json={
            "conversation_id": str(cid),
            "content": "Later message",
            "scheduled_for": future,
        },
        headers=_auth(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["is_sent"] is False
    assert body["scheduled_for"] is not None

    thread = client.get(
        f"/api/messages/conversation/{cid}",
        headers=_auth(token),
    )
    assert thread.status_code == 200
    assert all(m["id"] != body["id"] for m in thread.json())


def test_schedule_message_past_time_rejected(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]
    past = (utcnow() - timedelta(minutes=5)).isoformat()

    response = client.post(
        "/api/messages/",
        json={
            "conversation_id": str(cid),
            "content": "Too late",
            "scheduled_for": past,
        },
        headers=_auth(token),
    )
    assert response.status_code == 400


def test_list_scheduled_messages(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]
    future = (utcnow() + timedelta(hours=1)).isoformat()

    client.post(
        "/api/messages/",
        json={
            "conversation_id": str(cid),
            "content": "Scheduled one",
            "scheduled_for": future,
        },
        headers=_auth(token),
    )

    response = client.get("/api/messages/scheduled", headers=_auth(token))
    assert response.status_code == 200
    assert any(m["content"] == "Scheduled one" for m in response.json())


def test_cancel_scheduled_message(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]
    future = (utcnow() + timedelta(hours=1)).isoformat()

    created = client.post(
        "/api/messages/",
        json={
            "conversation_id": str(cid),
            "content": "Cancel me",
            "scheduled_for": future,
        },
        headers=_auth(token),
    ).json()

    response = client.delete(
        f"/api/messages/scheduled/{created['id']}", headers=_auth(token)
    )
    assert response.status_code == 200
    assert response.json()["is_deleted"] is True


def test_flush_scheduled_message(client: TestClient, test_conversation, db: Session):
    from app.services.message_service import MessageService

    cid = test_conversation["id"]
    token = test_conversation["token1"]
    when = utcnow() + timedelta(minutes=30)

    created = client.post(
        "/api/messages/",
        json={
            "conversation_id": str(cid),
            "content": "Wake up!",
            "scheduled_for": when.isoformat(),
        },
        headers=_auth(token),
    ).json()

    due = MessageService.list_due_scheduled_messages(
        db, before=when + timedelta(seconds=1)
    )
    assert len(due) == 1

    MessageService.flush_scheduled_message(db, due[0])
    db.commit()

    from app.models.message import Message

    sent = db.get(Message, due[0].id)
    assert sent.is_sent is True
    assert sent.scheduled_for is None

    thread = client.get(
        f"/api/messages/conversation/{cid}",
        headers=_auth(token),
    )
    assert any(m["id"] == str(created["id"]) for m in thread.json())


# ------------------------------------------------------------------
# Pinning
# ------------------------------------------------------------------


def test_pin_and_unpin_message(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]

    created = client.post(
        "/api/messages/",
        json={"conversation_id": str(cid), "content": "Pin me"},
        headers=_auth(token),
    ).json()
    mid = created["id"]

    pinned = client.patch(f"/api/messages/{mid}/pin", headers=_auth(token))
    assert pinned.status_code == 200
    assert pinned.json()["is_pinned"] is True
    assert pinned.json()["pinned_by_id"] == test_conversation["u1"]

    listing = client.get(
        f"/api/messages/conversation/{cid}/pinned", headers=_auth(token)
    )
    assert listing.status_code == 200
    assert any(m["id"] == mid for m in listing.json())

    unpinned = client.patch(f"/api/messages/{mid}/unpin", headers=_auth(token))
    assert unpinned.status_code == 200
    assert unpinned.json()["is_pinned"] is False

    listing = client.get(
        f"/api/messages/conversation/{cid}/pinned", headers=_auth(token)
    )
    assert all(m["id"] != mid for m in listing.json())


# ------------------------------------------------------------------
# Edit / Delete ownership
# ------------------------------------------------------------------


def test_cannot_edit_others_message(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token1 = test_conversation["token1"]
    token2 = test_conversation["token2"]

    created = client.post(
        "/api/messages/",
        json={"conversation_id": str(cid), "content": "Mine"},
        headers=_auth(token1),
    ).json()

    response = client.put(
        f"/api/messages/{created['id']}",
        json={"content": "Hijacked"},
        headers=_auth(token2),
    )
    assert response.status_code == 403


def test_cannot_delete_others_message(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token1 = test_conversation["token1"]
    token2 = test_conversation["token2"]

    created = client.post(
        "/api/messages/",
        json={"conversation_id": str(cid), "content": "Mine"},
        headers=_auth(token1),
    ).json()

    response = client.delete(f"/api/messages/{created['id']}", headers=_auth(token2))
    assert response.status_code == 403


def test_cannot_edit_deleted_message(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]

    created = client.post(
        "/api/messages/",
        json={"conversation_id": str(cid), "content": "Gone"},
        headers=_auth(token),
    ).json()
    client.delete(f"/api/messages/{created['id']}", headers=_auth(token))

    response = client.put(
        f"/api/messages/{created['id']}",
        json={"content": "Zombie"},
        headers=_auth(token),
    )
    assert response.status_code == 400


# ------------------------------------------------------------------
# Voice notes & message types
# ------------------------------------------------------------------


def test_send_voice_message(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token = test_conversation["token1"]

    response = client.post(
        "/api/messages/",
        json={
            "conversation_id": str(cid),
            "content": "Voice note",
            "type": "voice",
            "attachment_url": "/uploads/attachments/x/note.webm",
            "attachment_name": "note.webm",
            "attachment_size": 1024,
            "mime_type": "audio/webm",
        },
        headers=_auth(token),
    )
    assert response.status_code == 201
    assert response.json()["type"] == "voice"
    assert response.json()["mime_type"] == "audio/webm"


# ------------------------------------------------------------------
# Global search
# ------------------------------------------------------------------


def test_global_search_across_conversations(client: TestClient, test_conversation):
    cid = test_conversation["id"]
    token1 = test_conversation["token1"]
    token2 = test_conversation["token2"]

    client.post(
        "/api/messages/",
        json={"conversation_id": str(cid), "content": "Unicorn sighting"},
        headers=_auth(token1),
    )
    client.post(
        "/api/messages/",
        json={"conversation_id": str(cid), "content": "Dragon sighting"},
        headers=_auth(token2),
    )

    response = client.get("/api/messages/search?q=Unicorn", headers=_auth(token1))
    assert response.status_code == 200
    assert any(m["content"] == "Unicorn sighting" for m in response.json())
