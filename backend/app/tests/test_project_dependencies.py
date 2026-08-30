"""Tests for Project Dependencies — service and HTTP layer."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models.project import Project, ProjectStatus, ProjectVisibility
from app.models.project_dependency import DependencyType
from app.models.user import User
from app.schemas.project_dependency import BulkDependencyRequest, DependencyCreate, DependencyUpdate
from app.services.project_dependency_service import ProjectDependencyService


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


def _add_dep(db, src, tgt, dtype=DependencyType.HARD):
    return ProjectDependencyService.add(db, src, DependencyCreate(target_project_id=tgt, dependency_type=dtype))


# --- Service tests ---

def test_add_and_list(db):
    o = _user(db); a, b = _proj(db, o), _proj(db, o)
    dep = _add_dep(db, a.id, b.id)
    assert dep.source_project_id == a.id
    assert ProjectDependencyService.get_depends_on(db, a.id)["total"] == 1
    assert ProjectDependencyService.get_depended_by(db, b.id)["total"] == 1

def test_self_dep_rejected(db):
    o = _user(db); p = _proj(db, o)
    with pytest.raises(ValueError, match="Cannot depend on self"):
        ProjectDependencyService.add(db, p.id, DependencyCreate(target_project_id=p.id))

def test_duplicate_rejected(db):
    o = _user(db); a, b = _proj(db, o), _proj(db, o)
    _add_dep(db, a.id, b.id)
    with pytest.raises(ValueError, match="already exists"):
        _add_dep(db, a.id, b.id)

def test_remove(db):
    o = _user(db); a, b = _proj(db, o), _proj(db, o)
    _add_dep(db, a.id, b.id)
    assert ProjectDependencyService.remove(db, a.id, b.id)
    assert not ProjectDependencyService.remove(db, a.id, b.id)

def test_update(db):
    o = _user(db); a, b = _proj(db, o), _proj(db, o)
    dep = _add_dep(db, a.id, b.id)
    updated = ProjectDependencyService.update(db, dep.id,
        DependencyUpdate(dependency_type=DependencyType.OPTIONAL, version_constraint=">=1.0"))
    assert updated.dependency_type == DependencyType.OPTIONAL
    assert updated.version_constraint == ">=1.0"

def test_graph(db):
    o = _user(db); a, b, c = _proj(db, o), _proj(db, o), _proj(db, o)
    _add_dep(db, a.id, b.id)
    _add_dep(db, c.id, a.id)
    g = ProjectDependencyService.get_graph(db, a.id)
    assert len(g["depends_on"]) == 1 and len(g["depended_by"]) == 1

def test_stats(db):
    o = _user(db); a, b, c = _proj(db, o), _proj(db, o), _proj(db, o)
    _add_dep(db, a.id, b.id)
    _add_dep(db, a.id, c.id, DependencyType.SOFT)
    s = ProjectDependencyService.get_stats(db, a.id)
    assert s["total_depends_on"] == 2 and s["hard_count"] == 1 and s["soft_count"] == 1

def test_cycle_check(db):
    o = _user(db); a, b = _proj(db, o), _proj(db, o)
    _add_dep(db, a.id, b.id)
    r = ProjectDependencyService.detect_cycle(db, b.id, a.id)
    assert not r.has_cycle

def test_bulk(db):
    o = _user(db); a, b, c = _proj(db, o), _proj(db, o), _proj(db, o)
    r = ProjectDependencyService.bulk_add(db, a.id, BulkDependencyRequest(target_project_ids=[b.id, c.id]))
    assert len(r["added"]) == 2


# --- HTTP tests ---

def _auth(tok): return {"Authorization": f"Bearer {tok}"}

def test_api_add_remove(client, db, register_and_login):
    _, tok = register_and_login("a@x.com", "a")
    aid = client.post("/api/projects/", headers=_auth(tok), json={"title": "A", "slug": _slug(), "description": "d"}).json()["id"]
    bid = client.post("/api/projects/", headers=_auth(tok), json={"title": "B", "slug": _slug(), "description": "d"}).json()["id"]
    assert client.post(f"/api/v1/project-dependencies/{aid}", headers=_auth(tok), json={"target_project_id": bid}).status_code == 201
    assert client.delete(f"/api/v1/project-dependencies/{aid}/{bid}", headers=_auth(tok)).status_code == 204

def test_api_self_dep_rejected(client, db, register_and_login):
    _, tok = register_and_login("s@x.com", "s")
    pid = client.post("/api/projects/", headers=_auth(tok), json={"title": "S", "slug": _slug(), "description": "d"}).json()["id"]
    assert client.post(f"/api/v1/project-dependencies/{pid}", headers=_auth(tok), json={"target_project_id": pid}).status_code == 400

def test_api_list_stats(client, db, register_and_login):
    _, tok = register_and_login("l@x.com", "l")
    aid = client.post("/api/projects/", headers=_auth(tok), json={"title": "A", "slug": _slug(), "description": "d"}).json()["id"]
    bid = client.post("/api/projects/", headers=_auth(tok), json={"title": "B", "slug": _slug(), "description": "d"}).json()["id"]
    client.post(f"/api/v1/project-dependencies/{aid}", headers=_auth(tok), json={"target_project_id": bid})
    assert client.get(f"/api/v1/project-dependencies/{aid}").json()["total"] == 1
    assert client.get(f"/api/v1/project-dependencies/{aid}/reverse").json()["total"] == 1
    assert client.get(f"/api/v1/project-dependencies/{aid}/stats").json()["total_depends_on"] == 1
    assert len(client.get(f"/api/v1/project-dependencies/{aid}/graph").json()["depends_on"]) == 1

def test_api_cycle_check(client, db, register_and_login):
    _, tok = register_and_login("c@x.com", "c")
    aid = client.post("/api/projects/", headers=_auth(tok), json={"title": "A", "slug": _slug(), "description": "d"}).json()["id"]
    bid = client.post("/api/projects/", headers=_auth(tok), json={"title": "B", "slug": _slug(), "description": "d"}).json()["id"]
    client.post(f"/api/v1/project-dependencies/{aid}", headers=_auth(tok), json={"target_project_id": bid})
    r = client.get(f"/api/v1/project-dependencies/check-cycle?source_id={bid}&target_id={aid}")
    assert r.status_code == 200 and not r.json()["has_cycle"]

def test_api_auth_required(client, db):
    assert client.post(f"/api/v1/project-dependencies/{uuid.uuid4()}", json={"target_project_id": str(uuid.uuid4())}).status_code in (401, 403)
