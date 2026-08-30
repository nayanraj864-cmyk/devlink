"""Tests for Project Watchers feature — service and HTTP layer."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.project import Project, ProjectStatus, ProjectVisibility
from app.models.project_watcher import ProjectWatcher, WatchNotificationLevel
from app.models.user import User
from app.schemas.project_watcher import ProjectWatcherCreate, ProjectWatcherUpdate
from app.services.project_watcher_service import ProjectWatcherService
@pytest.fixture(scope="module")
def engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
@pytest.fixture
def db(engine):
    with Session(engine) as session:
        yield session
        session.rollback()
def _user(db, s=""):
    u = User(first_name="T", last_name="U", username=f"u_{uuid.uuid4().hex[:8]}{s}",
             email=f"{uuid.uuid4().hex[:8]}{s}@x.com", password_hash="h")
    db.add(u); db.flush(); return u
def _proj(db, owner):
    p = Project(owner_id=owner.id, title="P", slug=f"p-{uuid.uuid4().hex[:8]}",
                description="d", stage="idea", visibility=ProjectVisibility.PUBLIC,
                status=ProjectStatus.RECRUITING, is_published=True)
    db.add(p); db.flush(); return p
def _slug():
    return f"s-{uuid.uuid4().hex[:8]}"
# --- Service tests ---

def test_watch_idempotent(db):
    u, p = _user(db), _proj(db, _user(db))
    w1 = ProjectWatcherService.watch(db, u.id, p.id)
    w2 = ProjectWatcherService.watch(db, u.id, p.id)
    assert w1.id == w2.id

def test_watch_custom_level(db):
    u, p = _user(db), _proj(db, _user(db))
    w = ProjectWatcherService.watch(db, u.id, p.id, ProjectWatcherCreate(notification_level=WatchNotificationLevel.MINIMAL, notes="n"))
    assert w.notification_level == WatchNotificationLevel.MINIMAL and w.notes == "n"

def test_unwatch(db):
    u, p = _user(db), _proj(db, _user(db))
    ProjectWatcherService.watch(db, u.id, p.id)
    assert ProjectWatcherService.unwatch(db, u.id, p.id)
    assert not ProjectWatcherService.is_watching(db, u.id, p.id)

def test_unwatch_nonexistent(db):
    u, p = _user(db), _proj(db, _user(db))
    assert not ProjectWatcherService.unwatch(db, u.id, p.id)

def test_toggle(db):
    u, p = _user(db), _proj(db, _user(db))
    was, w = ProjectWatcherService.toggle_watch(db, u.id, p.id)
    assert not was and w is not None
    was2, w2 = ProjectWatcherService.toggle_watch(db, u.id, p.id)
    assert was2 and w2 is None

def test_update_watch(db):
    u, p = _user(db), _proj(db, _user(db))
    ProjectWatcherService.watch(db, u.id, p.id)
    w = ProjectWatcherService.update_watch(db, u.id, p.id,
        ProjectWatcherUpdate(notification_level=WatchNotificationLevel.MAJOR, is_pinned=True))
    assert w.notification_level == WatchNotificationLevel.MAJOR and w.is_pinned

def test_update_not_watching(db):
    u, p = _user(db), _proj(db, _user(db))
    assert ProjectWatcherService.update_watch(db, u.id, p.id,
        ProjectWatcherUpdate(notification_level=WatchNotificationLevel.MAJOR)) is None

def test_list_and_stats(db):
    o, p = _user(db), _proj(db, _user(db))
    u1, u2 = _user(db), _user(db)
    ProjectWatcherService.watch(db, u1.id, p.id, ProjectWatcherCreate(notification_level=WatchNotificationLevel.ALL))
    ProjectWatcherService.watch(db, u2.id, p.id, ProjectWatcherCreate(notification_level=WatchNotificationLevel.MINIMAL))
    assert ProjectWatcherService.list_project_watchers(db, p.id)["total"] == 2
    stats = ProjectWatcherService.get_project_stats(db, p.id)
    assert stats["total_watchers"] == 2 and stats["all_level_count"] == 1

def test_bulk(db):
    u, o = _user(db), _user(db)
    p1, p2 = _proj(db, o), _proj(db, o)
    r = ProjectWatcherService.bulk_toggle(db, u.id, [p1.id, p2.id], True)
    assert len(r["watched"]) == 2
    r2 = ProjectWatcherService.bulk_toggle(db, u.id, [p1.id, p2.id], False)
    assert len(r2["unwatched"]) == 2

def test_user_stats(db):
    u, p = _user(db), _proj(db, _user(db))
    ProjectWatcherService.watch(db, u.id, p.id)
    assert ProjectWatcherService.get_user_stats(db, u.id)["total_watched"] == 1

# --- HTTP tests ---

def _auth(tok): return {"Authorization": f"Bearer {tok}"}

def test_api_watch_unwatch(client, db, register_and_login):
    uid, tok = register_and_login("a@x.com", "a")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    assert client.post(f"/api/v1/project-watchers/{pid}/watch", headers=_auth(tok)).status_code == 201
    assert client.delete(f"/api/v1/project-watchers/{pid}/watch", headers=_auth(tok)).status_code == 204

def test_api_toggle(client, db, register_and_login):
    uid, tok = register_and_login("t@x.com", "t")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    assert client.post(f"/api/v1/project-watchers/{pid}/toggle", headers=_auth(tok)).json() is not None
    assert client.post(f"/api/v1/project-watchers/{pid}/toggle", headers=_auth(tok)).json() is None

def test_api_update_prefs(client, db, register_and_login):
    uid, tok = register_and_login("u@x.com", "u")
    pid = client.post("/api/projects/", headers=_auth(tok),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    client.post(f"/api/v1/project-watchers/{pid}/watch", headers=_auth(tok))
    r = client.patch(f"/api/v1/project-watchers/{pid}/watch", headers=_auth(tok),
                     json={"notification_level": "minimal", "is_pinned": True})
    assert r.status_code == 200 and r.json()["notification_level"] == "minimal"

def test_api_list_stats(client, db, register_and_login):
    _, t1 = register_and_login("l1@x.com", "l1")
    _, t2 = register_and_login("l2@x.com", "l2")
    pid = client.post("/api/projects/", headers=_auth(t1),
                      json={"title": "T", "slug": _slug(), "description": "d"}).json()["id"]
    client.post(f"/api/v1/project-watchers/{pid}/watch", headers=_auth(t1))
    client.post(f"/api/v1/project-watchers/{pid}/watch", headers=_auth(t2))
    assert client.get(f"/api/v1/project-watchers/project/{pid}").json()["total"] == 2
    assert client.get(f"/api/v1/project-watchers/project/{pid}/stats").json()["total_watchers"] == 2
    assert client.get("/api/v1/project-watchers/me/watched", headers=_auth(t1)).json()["total"] == 1

def test_api_auth_required(client, db):
    assert client.post(f"/api/v1/project-watchers/{uuid.uuid4()}/watch").status_code in (401, 403)
