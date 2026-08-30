from __future__ import annotations

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.dependencies import get_current_user, get_database
from app.main import app
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


def _create_test_user(db, username: str, email: str) -> User:
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


def _create_test_project(db, owner_id: uuid.UUID, title: str = "Test Project") -> Project:
    p = Project(
        id=uuid.uuid4(),
        owner_id=owner_id,
        title=title,
        slug=f"{title.lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}",
        tagline="Test Project Tagline",
        description="A comprehensive description of the test project for testing purposes.",
        is_published=True,
        is_archived=False,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# ---------------------------------------------------------------------
# Database Uniqueness Constraint Tests
# ---------------------------------------------------------------------


def test_db_uniqueness_constraint_raises_integrity_error():
    db = TestingSessionLocal()
    owner = _create_test_user(db, "owner1", "owner1@example.com")
    member = _create_test_user(db, "member1", "member1@example.com")
    project = _create_test_project(db, owner.id)

    # First member record
    pm1 = ProjectMember(
        project_id=project.id,
        user_id=member.id,
        role=MemberRole.CONTRIBUTOR,
        is_active=True,
    )
    db.add(pm1)
    db.commit()

    # Attempt second member record directly to trigger DB constraint
    pm2 = ProjectMember(
        project_id=project.id,
        user_id=member.id,
        role=MemberRole.REVIEWER,
        is_active=True,
    )
    db.add(pm2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.close()


# ---------------------------------------------------------------------
# Service Level Duplicate Prevention Tests
# ---------------------------------------------------------------------


def test_service_add_member_prevents_owner_duplicate():
    db = TestingSessionLocal()
    owner = _create_test_user(db, "proj_owner", "p_owner@example.com")
    project = _create_test_project(db, owner.id)

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        ProjectMemberService.add_member(
            db=db,
            project_id=project.id,
            user_id=owner.id,
            role=MemberRole.CONTRIBUTOR,
        )
    assert exc_info.value.status_code == 409
    assert "owner" in exc_info.value.detail.lower()
    db.close()


def test_service_add_member_prevents_active_duplicate():
    db = TestingSessionLocal()
    owner = _create_test_user(db, "owner_svc", "o_svc@example.com")
    dev = _create_test_user(db, "dev_svc", "dev_svc@example.com")
    project = _create_test_project(db, owner.id)

    # Add member successfully
    pm = ProjectMemberService.add_member(
        db=db,
        project_id=project.id,
        user_id=dev.id,
        role=MemberRole.CONTRIBUTOR,
        is_active=True,
    )
    assert pm.user_id == dev.id
    assert pm.is_active is True

    # Try adding the same member again
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        ProjectMemberService.add_member(
            db=db,
            project_id=project.id,
            user_id=dev.id,
            role=MemberRole.MAINTAINER,
            is_active=True,
        )
    assert exc_info.value.status_code == 409
    assert "active member" in exc_info.value.detail.lower()
    db.close()


def test_service_add_member_prevents_pending_invitation_duplicate():
    db = TestingSessionLocal()
    owner = _create_test_user(db, "owner_pending", "o_pending@example.com")
    dev = _create_test_user(db, "dev_pending", "dev_pending@example.com")
    project = _create_test_project(db, owner.id)

    # Add pending invitation
    ProjectMemberService.add_member(
        db=db,
        project_id=project.id,
        user_id=dev.id,
        role=MemberRole.MEMBER,
        is_active=False,
    )

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        ProjectMemberService.add_member(
            db=db,
            project_id=project.id,
            user_id=dev.id,
            role=MemberRole.CONTRIBUTOR,
            is_active=True,
        )
    assert exc_info.value.status_code == 409
    assert "pending invitation" in exc_info.value.detail.lower()
    db.close()


def test_get_project_members_deduplication():
    db = TestingSessionLocal()
    owner = _create_test_user(db, "dedup_owner", "dedup_o@example.com")
    member = _create_test_user(db, "dedup_member", "dedup_m@example.com")
    project = _create_test_project(db, owner.id)

    # Add member
    ProjectMemberService.add_member(
        db=db,
        project_id=project.id,
        user_id=member.id,
        role=MemberRole.CONTRIBUTOR,
        is_active=True,
    )

    members = ProjectMemberService.get_project_members(db, project.id)
    # Check that owner + 1 member returned, no duplicates
    assert len(members) == 2
    user_ids = [m["user_id"] for m in members]
    assert str(owner.id) in user_ids
    assert str(member.id) in user_ids
    assert len(user_ids) == len(set(user_ids))
    db.close()


# ---------------------------------------------------------------------
# API Endpoint Integration Tests
# ---------------------------------------------------------------------


def test_api_invite_user_duplicate_returns_409():
    client = TestClient(app)
    db = TestingSessionLocal()
    owner = _create_test_user(db, "api_owner", "api_o@example.com")
    invitee = _create_test_user(db, "api_invitee", "api_i@example.com")
    project = _create_test_project(db, owner.id)
    db.close()

    app.dependency_overrides[get_current_user] = lambda: owner

    # 1. First invitation succeeds with 201
    resp1 = client.post(f"/api/projects/{project.id}/invite/{invitee.id}")
    assert resp1.status_code == 201

    # 2. Second invitation fails with 409 Conflict
    resp2 = client.post(f"/api/projects/{project.id}/invite/{invitee.id}")
    assert resp2.status_code == 409
    assert "pending invitation" in resp2.json()["detail"].lower()


def test_api_invite_owner_returns_409():
    client = TestClient(app)
    db = TestingSessionLocal()
    owner = _create_test_user(db, "api_self_owner", "api_self@example.com")
    project = _create_test_project(db, owner.id)
    db.close()

    app.dependency_overrides[get_current_user] = lambda: owner

    resp = client.post(f"/api/projects/{project.id}/invite/{owner.id}")
    assert resp.status_code == 409
    assert "owner" in resp.json()["detail"].lower()
