"""Tests for Project FAQ / Knowledge Base — service and HTTP layer."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.project import Project, ProjectStatus, ProjectVisibility
from app.models.project_faq import FaqCategory, ProjectFaqEntry
from app.models.user import User
from app.schemas.project_faq import FaqEntryCreate, FaqEntryUpdate
from app.services.project_faq_service import ProjectFaqService


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


def _mk(db, q="How to install?", a="Run npm install.", cat=FaqCategory.SETUP):
    return FaqEntryCreate(question=q, answer=a, category=cat)


# --- Service tests ---

def test_create_get_delete(db):
    o, p = _user(db), _proj(db, _user(db))
    e = ProjectFaqService.create(db, p.id, o.id, _mk())
    assert e.project_id == p.id
    assert ProjectFaqService.get(db, e.id).question == "How to install?"
    assert ProjectFaqService.delete(db, e.id)
    assert not ProjectFaqService.get(db, e.id)


def test_update(db):
    o, p = _user(db), _proj(db, _user(db))
    e = ProjectFaqService.create(db, p.id, o.id, _mk())
    u = ProjectFaqService.update(db, e.id, FaqEntryUpdate(question="Updated?", is_pinned=True))
    assert u.question == "Updated?" and u.is_pinned


def test_list_and_search(db):
    o, p = _user(db), _proj(db, _user(db))
    ProjectFaqService.create(db, p.id, o.id, _mk(q="Build Q", a="run make", cat=FaqCategory.GENERAL))
    ProjectFaqService.create(db, p.id, o.id, _mk(q="Deploy Q", cat=FaqCategory.DEPLOYMENT))
    assert ProjectFaqService.list_entries(db, p.id)["total"] == 2
    assert ProjectFaqService.list_entries(db, p.id, category=FaqCategory.DEPLOYMENT)["total"] == 1
    assert ProjectFaqService.search(db, p.id, "build")["total"] >= 1


def test_upvote_view(db):
    o, p = _user(db), _proj(db, _user(db))
    e = ProjectFaqService.create(db, p.id, o.id, _mk())
    ProjectFaqService.upvote(db, e.id)
    ProjectFaqService.record_view(db, e.id)
    ProjectFaqService.record_view(db, e.id)
    fetched = ProjectFaqService.get(db, e.id)
    assert fetched.upvotes == 1 and fetched.views == 2


def test_stats_bulk_top(db):
    o, p = _user(db), _proj(db, _user(db))
    e1 = ProjectFaqService.create(db, p.id, o.id, _mk(q="Q1"))
    ProjectFaqService.create(db, p.id, o.id, _mk(q="Q2"))
    ProjectFaqService.update(db, e1.id, FaqEntryUpdate(is_accepted=True))
    for _ in range(3): ProjectFaqService.upvote(db, e1.id)
    s = ProjectFaqService.get_stats(db, p.id)
    assert s["total_entries"] == 2 and s["accepted_count"] == 1
    r = ProjectFaqService.bulk_create(db, p.id, o.id, [_mk(q=f"B{i}") for i in range(2)])
    assert r["created"] == 2
    top = ProjectFaqService.top_entries(db, p.id, limit=1)
    assert top[0].id == e1.id


# --- HTTP tests ---

def _auth(tok): return {"Authorization": f"Bearer {tok}"}


def test_api_crud(client, db, register_and_login):
    _, tok = register_and_login("a@x.com", "a")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    r = client.post(f"/api/v1/project-faq/{pid}", headers=_auth(tok),
                    json={"question": "How to install?", "answer": "npm i", "category": "setup"})
    assert r.status_code == 201
    eid = r.json()["id"]
    assert client.get(f"/api/v1/project-faq/{pid}").json()["total"] == 1
    assert client.get(f"/api/v1/project-faq/{pid}/search?q=install").json()["total"] >= 1
    assert client.get(f"/api/v1/project-faq/entry/{eid}").json()["views"] == 1
    r = client.patch(f"/api/v1/project-faq/entry/{eid}", headers=_auth(tok),
                     json={"question": "Updated?", "is_pinned": True})
    assert r.json()["question"] == "Updated?"
    assert client.delete(f"/api/v1/project-faq/entry/{eid}", headers=_auth(tok)).status_code == 204


def test_api_upvote_stats_bulk(client, db, register_and_login):
    _, tok = register_and_login("c@x.com", "c")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    eid = client.post(f"/api/v1/project-faq/{pid}", headers=_auth(tok),
                      json={"question": "Q?", "answer": "A"}).json()["id"]
    assert client.post(f"/api/v1/project-faq/entry/{eid}/upvote", headers=_auth(tok)).json()["upvotes"] == 1
    assert client.get(f"/api/v1/project-faq/{pid}/stats").json()["total_entries"] == 1
    entries = [{"question": f"Q{i}?", "answer": f"A{i}"} for i in range(3)]
    r = client.post(f"/api/v1/project-faq/{pid}/bulk", headers=_auth(tok), json={"entries": entries})
    assert r.status_code == 201 and r.json()["created"] == 3


def test_api_auth_required(client, db):
    assert client.post(f"/api/v1/project-faq/{uuid.uuid4()}",
                       json={"question": "Q?", "answer": "A"}).status_code in (401, 403)
