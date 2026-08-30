from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.dependencies import get_database
from app.main import app
from app.models.skill import Skill
from app.models.user import User
from app.models.user_skill import SkillLevel, UserSkill
from app.services.search_service import SearchService, count_results, search_users

# SQLite test in-memory database configuration
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


def _create_test_user(
    db,
    username: str,
    email: str,
    first_name: str = "Test",
    last_name: str = "User",
    role: str = "Full Stack Engineer",
    headline: str = "Building amazing web apps",
    location: str = "San Francisco, CA",
    company: str = "TechCorp",
    experience_level: str = "advanced",
    open_to_work: bool = True,
    is_active: bool = True,
) -> User:
    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=role,
        headline=headline,
        location=location,
        company=company,
        experience_level=experience_level,
        open_to_work=open_to_work,
        is_active=is_active,
        password_hash="fake_hash",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_test_skill(db, name: str, slug: str, category: str = "Frontend") -> Skill:
    skill = Skill(
        name=name,
        normalized_name=name.lower(),
        slug=slug,
        category=category,
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


def _assign_skill_to_user(
    db,
    user_id,
    skill_id,
    level: SkillLevel = SkillLevel.ADVANCED,
    years: int = 3,
):
    us = UserSkill(
        user_id=user_id,
        skill_id=skill_id,
        level=level,
        years_of_experience=years,
    )
    db.add(us)
    db.commit()
    db.refresh(us)
    return us


# ---------------------------------------------------------------------
# Unit & Service Level Tests for Builder Search Optimization
# ---------------------------------------------------------------------


def test_builder_search_keyword_and_relevance():
    db = TestingSessionLocal()
    u1 = _create_test_user(
        db,
        username="dev_react_expert",
        email="react_expert@example.com",
        first_name="Alice",
        last_name="Smith",
        role="Senior React Engineer",
        headline="Architecting frontend micro-frontends in React and Next.js",
    )
    u2 = _create_test_user(
        db,
        username="dev_backend_python",
        email="python_dev@example.com",
        first_name="Bob",
        last_name="Jones",
        role="Backend Python Developer",
        headline="FastAPI and Distributed Systems",
    )

    results = search_users(db, q="react")
    assert len(results) >= 1
    assert results[0].username == "dev_react_expert"

    results_py = search_users(db, q="FastAPI")
    assert len(results_py) >= 1
    assert results_py[0].username == "dev_backend_python"
    db.close()


def test_builder_search_filter_by_skills():
    db = TestingSessionLocal()
    u1 = _create_test_user(
        db,
        username="ts_builder",
        email="ts@example.com",
        role="Frontend Engineer",
        headline="TypeScript fanatic",
    )
    u2 = _create_test_user(
        db,
        username="go_builder",
        email="go@example.com",
        role="Cloud Engineer",
        headline="Go microservices",
    )

    skill_ts = _create_test_skill(db, name="TypeScript", slug="typescript")
    skill_go = _create_test_skill(db, name="Golang", slug="golang")

    _assign_skill_to_user(db, u1.id, skill_ts.id)
    _assign_skill_to_user(db, u2.id, skill_go.id)

    # Search with skills filter
    res_ts = search_users(db, q="builder", skills=["TypeScript"])
    assert len(res_ts) == 1
    assert res_ts[0].username == "ts_builder"

    res_go = search_users(db, q="builder", skills=["Golang"])
    assert len(res_go) == 1
    assert res_go[0].username == "go_builder"

    res_both = search_users(db, q="builder", skills=["TypeScript", "Golang"])
    assert len(res_both) == 2
    db.close()


def test_builder_search_filter_by_availability():
    db = TestingSessionLocal()
    u1 = _create_test_user(
        db,
        username="open_dev",
        email="open@example.com",
        role="UI Developer",
        open_to_work=True,
    )
    u2 = _create_test_user(
        db,
        username="busy_dev",
        email="busy@example.com",
        role="UI Developer",
        open_to_work=False,
    )

    res_avail = search_users(db, q="Developer", availability=True)
    assert any(u.username == "open_dev" for u in res_avail)
    assert not any(u.username == "busy_dev" for u in res_avail)

    res_busy = search_users(db, q="Developer", availability=False)
    assert any(u.username == "busy_dev" for u in res_busy)
    assert not any(u.username == "open_dev" for u in res_busy)
    db.close()


def test_builder_search_composite_filters():
    db = TestingSessionLocal()
    skill_react = _create_test_skill(db, name="React", slug="react")

    u1 = _create_test_user(
        db,
        username="remote_sr_react",
        email="remotereact@example.com",
        role="Senior Developer",
        location="Remote, USA",
        company="Distributed Inc",
        experience_level="expert",
        open_to_work=True,
    )
    _assign_skill_to_user(db, u1.id, skill_react.id)

    u2 = _create_test_user(
        db,
        username="onsite_jr_react",
        email="onsitereact@example.com",
        role="Junior Developer",
        location="New York, NY",
        company="Office Co",
        experience_level="beginner",
        open_to_work=True,
    )
    _assign_skill_to_user(db, u2.id, skill_react.id)

    # Filter with skills + availability + experience + remote
    res = search_users(
        db,
        q="Developer",
        skills=["React"],
        availability=True,
        experience="expert",
        remote=True,
    )
    assert len(res) == 1
    assert res[0].username == "remote_sr_react"
    db.close()


def test_builder_search_eager_loading_avoids_n_plus_one():
    db = TestingSessionLocal()
    skill1 = _create_test_skill(db, "Next.js", "nextjs")
    skill2 = _create_test_skill(db, "Tailwind", "tailwind")

    u = _create_test_user(db, "eager_dev", "eager@example.com", role="Fullstack Dev")
    _assign_skill_to_user(db, u.id, skill1.id)
    _assign_skill_to_user(db, u.id, skill2.id)

    # Execute full search service call
    results = SearchService.search(
        db=db,
        q="eager",
        category="developers",
        page=1,
        limit=10,
    )

    assert len(results["users"]) == 1
    user_res = results["users"][0]
    assert user_res.username == "eager_dev"
    assert "Next.js" in user_res.skills
    assert "Tailwind" in user_res.skills
    db.close()


def test_count_results_uses_optimized_queries():
    db = TestingSessionLocal()
    _create_test_user(db, "count_dev1", "c1@example.com", role="Rust Engineer")
    _create_test_user(db, "count_dev2", "c2@example.com", role="Rust Engineer")

    counts = count_results(db, "Rust")
    assert counts.developers == 2
    assert counts.total >= 2
    db.close()


# ---------------------------------------------------------------------
# API Endpoint Integration Tests
# ---------------------------------------------------------------------


def test_api_full_search_builder_filters():
    client = TestClient(app)
    db = TestingSessionLocal()

    skill_python = _create_test_skill(db, name="Python", slug="python")
    dev = _create_test_user(
        db,
        username="api_py_builder",
        email="api_py@example.com",
        role="Backend Architect",
        headline="Python & AsyncIO",
        open_to_work=True,
        experience_level="expert",
        location="Remote",
    )
    _assign_skill_to_user(db, dev.id, skill_python.id)
    db.close()

    # Call endpoint with all filter params
    resp = client.get(
        "/api/search",
        params={
            "q": "Backend",
            "category": "developers",
            "skills": "Python",
            "availability": "true",
            "experience": "expert",
            "remote": "true",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["users"]) == 1
    assert data["users"][0]["username"] == "api_py_builder"
    assert "Python" in data["users"][0]["skills"]
