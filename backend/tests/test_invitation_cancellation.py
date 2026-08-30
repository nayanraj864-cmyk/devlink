from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.dependencies import get_current_user, get_database
from app.main import app
from app.models.audit_log import AuditAction, AuditLog
from app.models.notification import Notification, NotificationType
from app.models.project import Project
from app.models.project_member import MemberRole, ProjectMember
from app.models.user import User
from app.services.project_member_service import ProjectMemberService

# SQLite in-memory test database
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


def _create_project(db, owner_id: uuid.UUID, title: str = "Test Project") -> Project:
    p = Project(
        id=uuid.uuid4(),
        owner_id=owner_id,
        title=title,
        slug=f"{title.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}",
        tagline="Test Project Tagline",
        description="A comprehensive description of the test project for testing invitation cancellation.",
        is_published=True,
        is_archived=False,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# ---------------------------------------------------------------------
# Service Unit Tests for Invitation Cancellation
# ---------------------------------------------------------------------


def test_cancel_pending_invitation_success():
    db = TestingSessionLocal()
    owner = _create_user(db, "owner_cancel", "ocancel@example.com")
    invitee = _create_user(db, "invitee_cancel", "icancel@example.com")
    project = _create_project(db, owner.id)

    # 1. Create pending invitation
    pm = ProjectMember(
        project_id=project.id,
        user_id=invitee.id,
        role=MemberRole.MEMBER,
        is_active=False,
    )
    db.add(pm)
    # Add invitation notification
    notif = Notification(
        id=uuid.uuid4(),
        recipient_id=invitee.id,
        sender_id=owner.id,
        type=NotificationType.PROJECT_INVITE,
        title="Project Invitation",
        message="You are invited",
        project_id=project.id,
        read=False,
    )
    db.add(notif)
    db.commit()

    # 2. Cancel invitation
    ProjectMemberService.cancel_invitation(
        db=db,
        project_id=project.id,
        target_user_id=invitee.id,
        actor_user=owner,
    )

    # 3. Assert project member record deleted
    check_pm = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == invitee.id,
        )
    )
    assert check_pm is None

    # 4. Assert notification marked as read
    db.refresh(notif)
    assert notif.read is True

    # 5. Assert audit log emitted
    audit = db.scalar(
        select(AuditLog).where(
            AuditLog.project_id == project.id,
            AuditLog.action == AuditAction.INVITATION_REVOKED,
        )
    )
    assert audit is not None
    assert audit.target_user_id == invitee.id
    db.close()


def test_cancel_invitation_unauthorized_user_raises_403():
    db = TestingSessionLocal()
    owner = _create_user(db, "owner_perm", "operm@example.com")
    stranger = _create_user(db, "stranger_user", "stranger@example.com")
    invitee = _create_user(db, "invitee_perm", "iperm@example.com")
    project = _create_project(db, owner.id)

    # Pending invitation
    pm = ProjectMember(
        project_id=project.id,
        user_id=invitee.id,
        role=MemberRole.MEMBER,
        is_active=False,
    )
    db.add(pm)
    db.commit()

    from fastapi import HTTPException

    # Stranger attempts to cancel
    with pytest.raises(HTTPException) as exc:
        ProjectMemberService.cancel_invitation(
            db=db,
            project_id=project.id,
            target_user_id=invitee.id,
            actor_user=stranger,
        )
    assert exc.value.status_code == 403
    assert "owners and admins" in exc.value.detail.lower()
    db.close()


def test_cancel_active_member_raises_400():
    db = TestingSessionLocal()
    owner = _create_user(db, "owner_act", "oact@example.com")
    member = _create_user(db, "active_member", "actm@example.com")
    project = _create_project(db, owner.id)

    # Active member (is_active=True)
    pm = ProjectMember(
        project_id=project.id,
        user_id=member.id,
        role=MemberRole.CONTRIBUTOR,
        is_active=True,
    )
    db.add(pm)
    db.commit()

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        ProjectMemberService.cancel_invitation(
            db=db,
            project_id=project.id,
            target_user_id=member.id,
            actor_user=owner,
        )
    assert exc.value.status_code == 400
    assert "already an active member" in exc.value.detail.lower()
    db.close()


def test_cancel_nonexistent_invitation_raises_404():
    db = TestingSessionLocal()
    owner = _create_user(db, "owner_404", "o404@example.com")
    non_invitee = _create_user(db, "nobody", "nobody@example.com")
    project = _create_project(db, owner.id)

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        ProjectMemberService.cancel_invitation(
            db=db,
            project_id=project.id,
            target_user_id=non_invitee.id,
            actor_user=owner,
        )
    assert exc.value.status_code == 404
    assert "no invitation found" in exc.value.detail.lower()
    db.close()


# ---------------------------------------------------------------------
# API Integration Tests for Cancel Endpoints
# ---------------------------------------------------------------------


def test_api_cancel_invitation_delete_method():
    client = TestClient(app)
    db = TestingSessionLocal()
    owner = _create_user(db, "api_owner_del", "odel@example.com")
    invitee = _create_user(db, "api_invitee_del", "idel@example.com")
    project = _create_project(db, owner.id)

    # Add pending invitation
    pm = ProjectMember(
        project_id=project.id,
        user_id=invitee.id,
        role=MemberRole.MEMBER,
        is_active=False,
    )
    db.add(pm)
    db.commit()
    db.close()

    app.dependency_overrides[get_current_user] = lambda: owner

    # DELETE /api/projects/{project_id}/invitations/{user_id}
    res = client.delete(f"/api/projects/{project.id}/invitations/{invitee.id}")
    assert res.status_code == 200
    assert "cancelled successfully" in res.json()["message"].lower()


def test_api_cancel_invitation_post_alias():
    client = TestClient(app)
    db = TestingSessionLocal()
    owner = _create_user(db, "api_owner_post", "opost@example.com")
    invitee = _create_user(db, "api_invitee_post", "ipost@example.com")
    project = _create_project(db, owner.id)

    # Add pending invitation
    pm = ProjectMember(
        project_id=project.id,
        user_id=invitee.id,
        role=MemberRole.MEMBER,
        is_active=False,
    )
    db.add(pm)
    db.commit()
    db.close()

    app.dependency_overrides[get_current_user] = lambda: owner

    # POST /api/projects/{project_id}/invitations/{user_id}/cancel
    res = client.post(f"/api/projects/{project.id}/invitations/{invitee.id}/cancel")
    assert res.status_code == 200
    assert "cancelled successfully" in res.json()["message"].lower()
