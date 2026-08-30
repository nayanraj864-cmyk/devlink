"""Tests for Project Polls — service and HTTP layer."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.project import Project, ProjectStatus, ProjectVisibility
from app.models.project_poll import PollOption, PollStatus
from app.models.user import User
from app.schemas.project_poll import PollCreate, PollOptionCreate, PollUpdate, VoteRequest
from app.services.project_poll_service import ProjectPollService


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


def _mk(q="Best framework?"):
    return PollCreate(question=q, options=[PollOptionCreate(text=t) for t in ["React", "Vue", "Svelte"]])


def _opts(db, poll_id):
    return list(db.scalars(select(PollOption).where(PollOption.poll_id == poll_id)))


# --- Service tests ---

def test_create_and_get(db):
    o, p = _user(db), _proj(db, _user(db))
    poll = ProjectPollService.create(db, p.id, o.id, _mk())
    assert poll.status == PollStatus.ACTIVE and len(_opts(db, poll.id)) == 3
    r = ProjectPollService.get_with_results(db, poll.id)
    assert r["total_votes"] == 0 and not r["has_voted"]


def test_vote_and_remove(db):
    o, p = _user(db), _proj(db, _user(db))
    poll = ProjectPollService.create(db, p.id, o.id, _mk())
    opts = _opts(db, poll.id)
    voter = _user(db)
    r = ProjectPollService.vote(db, poll.id, voter.id, VoteRequest(option_ids=[opts[0].id]))
    assert r["has_voted"] and r["total_votes"] == 1
    assert ProjectPollService.remove_vote(db, poll.id, voter.id)
    r2 = ProjectPollService.get_with_results(db, poll.id, voter.id)
    assert not r2["has_voted"]


def test_close_poll(db):
    o, p = _user(db), _proj(db, _user(db))
    poll = ProjectPollService.create(db, p.id, o.id, _mk())
    updated = ProjectPollService.update(db, poll.id, PollUpdate(status=PollStatus.CLOSED))
    assert updated.status == PollStatus.CLOSED


def test_stats(db):
    o, p = _user(db), _proj(db, _user(db))
    ProjectPollService.create(db, p.id, o.id, _mk("Q1"))
    ProjectPollService.create(db, p.id, o.id, _mk("Q2"))
    s = ProjectPollService.get_stats(db, p.id)
    assert s["total_polls"] == 2 and s["active_polls"] == 2


def test_delete_poll(db):
    o, p = _user(db), _proj(db, _user(db))
    poll = ProjectPollService.create(db, p.id, o.id, _mk())
    assert ProjectPollService.delete(db, poll.id)
    assert not ProjectPollService.get(db, poll.id)


# --- HTTP tests ---

def _auth(tok): return {"Authorization": f"Bearer {tok}"}


def test_api_crud(client, db, register_and_login):
    _, tok = register_and_login("a@x.com", "a")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    r = client.post(f"/api/v1/project-polls/{pid}", headers=_auth(tok),
                    json={"question": "Best lang?", "options": [{"text": "Py"}, {"text": "Rust"}]})
    assert r.status_code == 201
    poll_id, opt_id = r.json()["id"], r.json()["options"][0]["id"]
    r = client.post(f"/api/v1/project-polls/poll/{poll_id}/vote", headers=_auth(tok),
                    json={"option_ids": [opt_id]})
    assert r.json()["total_votes"] == 1 and r.json()["has_voted"]
    r = client.delete(f"/api/v1/project-polls/poll/{poll_id}/vote", headers=_auth(tok))
    assert r.status_code == 204
    r = client.patch(f"/api/v1/project-polls/poll/{poll_id}/close", headers=_auth(tok))
    assert r.json()["status"] == "closed"


def test_api_list_stats(client, db, register_and_login):
    _, tok = register_and_login("b@x.com", "b")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    client.post(f"/api/v1/project-polls/{pid}", headers=_auth(tok),
                json={"question": "Q?", "options": [{"text": "A"}, {"text": "B"}]})
    assert client.get(f"/api/v1/project-polls/{pid}").json()["total"] == 1
    assert client.get(f"/api/v1/project-polls/{pid}/stats").json()["total_polls"] == 1


def test_api_auth_required(client, db):
    assert client.post(f"/api/v1/project-polls/{uuid.uuid4()}",
                       json={"question": "Q?", "options": [{"text": "A"}, {"text": "B"}]}).status_code in (401, 403)
