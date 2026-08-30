from __future__ import annotations

from datetime import timedelta
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_member import InvitationStatus, ProjectMember
from app.utils.time import utcnow


def _create_project(client: TestClient, token: str) -> str:
    res = client.post(
        "/api/projects/",
        json={
            "title": "Invite Expiry Project",
            "slug": f"invite-exp-{utcnow().timestamp()}",
            "description": "Invitation expiration",
            "status": "active",
            "visibility": "public",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()["id"]


def test_invite_stores_expiration_and_pending_status(
    client: TestClient, register_and_login
):
    _, owner_token = register_and_login("invexp_owner@example.com", "invexp_owner")
    invitee_id, _ = register_and_login("invexp_invitee@example.com", "invexp_invitee")
    project_id = _create_project(client, owner_token)

    res = client.post(
        f"/api/projects/{project_id}/invite/{invitee_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["status"] == InvitationStatus.PENDING.value
    assert body["expires_at"] is not None


def test_accept_invitation(client: TestClient, register_and_login):
    _, owner_token = register_and_login("invacc_owner@example.com", "invacc_owner")
    invitee_id, invitee_token = register_and_login(
        "invacc_invitee@example.com", "invacc_invitee"
    )
    project_id = _create_project(client, owner_token)

    invite = client.post(
        f"/api/projects/{project_id}/invite/{invitee_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert invite.status_code == 201

    accepted = client.post(
        f"/api/projects/{project_id}/invitations/accept",
        headers={"Authorization": f"Bearer {invitee_token}"},
    )
    assert accepted.status_code == 200
    body = accepted.json()
    assert body["status"] == InvitationStatus.ACCEPTED.value


def test_accept_expired_invitation_is_rejected(
    client: TestClient, register_and_login, db: Session
):
    _, owner_token = register_and_login("invold_owner@example.com", "invold_owner")
    invitee_id, invitee_token = register_and_login(
        "invold_invitee@example.com", "invold_invitee"
    )
    project_id = _create_project(client, owner_token)

    invite = client.post(
        f"/api/projects/{project_id}/invite/{invitee_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert invite.status_code == 201

    membership = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == UUID(project_id),
            ProjectMember.user_id == UUID(invitee_id),
        )
    )
    assert membership is not None
    membership.expires_at = utcnow() - timedelta(seconds=1)
    db.commit()

    rejected = client.post(
        f"/api/projects/{project_id}/invitations/accept",
        headers={"Authorization": f"Bearer {invitee_token}"},
    )
    assert rejected.status_code == 400
    assert rejected.json()["detail"] == "Invitation has expired"
