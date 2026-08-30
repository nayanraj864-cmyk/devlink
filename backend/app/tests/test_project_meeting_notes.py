"""Tests for Project Meeting Notes — service and HTTP layer."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.project import Project, ProjectStatus, ProjectVisibility
from app.models.project_meeting_note import ProjectMeetingNote
from app.models.user import User
from app.schemas.project_meeting_note import ActionItem, MeetingNoteCreate, MeetingNoteUpdate
from app.services.project_meeting_note_service import ProjectMeetingNoteService


@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    yield eng; Base.metadata.drop_all(eng)


@pytest.fixture
def db(engine):
    with Session(engine) as session:
        yield session; session.rollback()


def _user(db):
    u = User(first_name="T", last_name="U", username=f"u_{uuid.uuid4().hex[:8]}",
             email=f"{uuid.uuid4().hex[:8]}@x.com", password_hash="h")
    db.add(u); db.flush(); return u


def _proj(db, owner):
    p = Project(owner_id=owner.id, title="P", slug=f"p-{uuid.uuid4().hex[:8]}",
                description="d", stage="idea", visibility=ProjectVisibility.PUBLIC,
                status=ProjectStatus.RECRUITING, is_published=True)
    db.add(p); db.flush(); return p


def _slug():
    return f"s-{uuid.uuid4().hex[:8]}"


def _mk(title="Sprint Review", summary="Discussed progress.", tags=None, actions=None):
    return MeetingNoteCreate(
        title=title, summary=summary, meeting_date=datetime.now(timezone.utc),
        duration_minutes=60, tags=tags or ["sprint"],
        action_items=actions or [ActionItem(description="Fix bug #1")],
        decisions=["Ship v2 on Friday"])


# --- Service tests ---

def test_create_get_delete(db):
    o, p = _user(db), _proj(db, _user(db))
    note = ProjectMeetingNoteService.create(db, p.id, o.id, _mk())
    assert note.project_id == p.id and note.title == "Sprint Review"
    assert ProjectMeetingNoteService.get(db, note.id).duration_minutes == 60
    assert ProjectMeetingNoteService.delete(db, note.id)
    assert not ProjectMeetingNoteService.get(db, note.id)


def test_update(db):
    o, p = _user(db), _proj(db, _user(db))
    note = ProjectMeetingNoteService.create(db, p.id, o.id, _mk())
    updated = ProjectMeetingNoteService.update(db, note.id,
        MeetingNoteUpdate(title="Updated", duration_minutes=90, decisions=["New decision"]))
    assert updated.title == "Updated" and updated.duration_minutes == 90


def test_list_notes(db):
    o, p = _user(db), _proj(db, _user(db))
    for i in range(3):
        ProjectMeetingNoteService.create(db, p.id, o.id, _mk(title=f"Meeting {i}", tags=["sprint"]))
    r = ProjectMeetingNoteService.list_notes(db, p.id)
    assert r["total"] == 3 and len(r["items"]) == 3


def test_search(db):
    o, p = _user(db), _proj(db, _user(db))
    ProjectMeetingNoteService.create(db, p.id, o.id, _mk(summary="Discussed deployment pipeline"))
    r = ProjectMeetingNoteService.search(db, p.id, "deployment")
    assert r["total"] >= 1


def test_complete_action_item(db):
    o, p = _user(db), _proj(db, _user(db))
    note = ProjectMeetingNoteService.create(db, p.id, o.id, _mk())
    assert not note.action_items[0]["is_completed"]
    updated = ProjectMeetingNoteService.complete_action_item(db, note.id, 0)
    assert updated.action_items[0]["is_completed"]


def test_get_action_items(db):
    o, p = _user(db), _proj(db, _user(db))
    ProjectMeetingNoteService.create(db, p.id, o.id, _mk(
        actions=[ActionItem(description="Task A"), ActionItem(description="Task B", is_completed=True)]))
    all_items = ProjectMeetingNoteService.get_action_items(db, p.id)
    assert len(all_items) == 2
    pending = ProjectMeetingNoteService.get_action_items(db, p.id, completed=False)
    assert len(pending) == 1


def test_stats(db):
    o, p = _user(db), _proj(db, _user(db))
    u2 = _user(db)
    ProjectMeetingNoteService.create(db, p.id, o.id,
        _mk(actions=[ActionItem(description="A"), ActionItem(description="B", is_completed=True)]))
    ProjectMeetingNoteService.create(db, p.id, o.id, _mk(title="M2"))
    s = ProjectMeetingNoteService.get_stats(db, p.id)
    assert s["total_meetings"] == 2 and s["completed_action_items"] == 1


# --- HTTP tests ---

def _auth(tok): return {"Authorization": f"Bearer {tok}"}


def test_api_crud(client, db, register_and_login):
    _, tok = register_and_login("a@x.com", "a")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    r = client.post(f"/api/v1/project-meetings/{pid}", headers=_auth(tok),
                    json={"title": "Sprint 1", "summary": "Discussed roadmap.",
                          "duration_minutes": 45, "tags": ["sprint"],
                          "action_items": [{"description": "Fix bug"}], "decisions": ["Ship next week"]})
    assert r.status_code == 201
    nid = r.json()["id"]
    assert client.get(f"/api/v1/project-meetings/{pid}").json()["total"] == 1
    r = client.get(f"/api/v1/project-meetings/{pid}/search?q=sprint")
    assert r.json()["total"] >= 1
    r = client.patch(f"/api/v1/project-meetings/note/{nid}", headers=_auth(tok),
                     json={"title": "Updated Sprint"})
    assert r.json()["title"] == "Updated Sprint"
    r = client.patch(f"/api/v1/project-meetings/note/{nid}/action-items/0/complete", headers=_auth(tok))
    assert r.json()["action_items"][0]["is_completed"]
    assert client.delete(f"/api/v1/project-meetings/note/{nid}", headers=_auth(tok)).status_code == 204


def test_api_stats_action_items(client, db, register_and_login):
    _, tok = register_and_login("b@x.com", "b")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    client.post(f"/api/v1/project-meetings/{pid}", headers=_auth(tok),
                json={"title": "M1", "summary": "s", "duration_minutes": 30,
                      "action_items": [{"description": "Do stuff"}]})
    r = client.get(f"/api/v1/project-meetings/{pid}/stats")
    assert r.json()["total_meetings"] == 1
    r = client.get(f"/api/v1/project-meetings/{pid}/action-items")
    assert len(r.json()) == 1


def test_api_auth_required(client, db):
    assert client.post(f"/api/v1/project-meetings/{uuid.uuid4()}",
                       json={"title": "Q", "summary": "A"}).status_code in (401, 403)
