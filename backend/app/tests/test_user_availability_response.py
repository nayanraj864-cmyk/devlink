"""Regression tests for #1346.

`User` declared `availability` twice: a JSON column holding the weekly slots
`UserResponse.availability` serialises, and -- 285 lines later -- a scalar
relationship to `UserAvailability` added with the calendar feature. The second
class attribute replaced the first, so every user serialised the relationship,
and for a user with no `user_availability` row that is None against a
`list[AvailabilitySlot]` field.

FastAPI validates responses, so the result was a 500 *after* the handler had
returned -- registration created the account and then reported a server error.

Nineteen tests failed on this, all of them through a fixture that registers a
user. None of them named it, so these do.
"""

import pytest
from fastapi import status

from app.models.user import User
from app.models.user_availability import UserAvailability


def test_register_returns_200_and_an_empty_availability_list(client):
    """The happy path: a brand-new user has no `user_availability` row."""
    response = client.post(
        "/api/auth/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": "availability-register@example.com",
            "username": "availability_register",
            "password": "Vermilion-Kestrel97!",
        },
    )

    assert response.status_code == status.HTTP_201_CREATED, response.text
    body = response.json()
    user = body.get("user", body)
    assert user["availability"] == []


def test_refresh_returns_200(client):
    """`/api/auth/refresh` serialises a user too, and was 500 for the same reason."""
    client.post(
        "/api/auth/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": "availability-refresh@example.com",
            "username": "availability_refresh",
            "password": "Vermilion-Kestrel97!",
        },
    )
    login = client.post(
        "/api/auth/login",
        json={
            "email": "availability-refresh@example.com",
            "password": "Vermilion-Kestrel97!",
        },
    )
    refresh_token = login.json().get("refresh_token")
    assert refresh_token, login.text

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

    assert response.status_code == status.HTTP_200_OK, response.text


def test_availability_column_is_not_shadowed_by_the_relationship(db):
    """The column and the relationship are different attributes, and both work."""
    user = User(
        first_name="Test",
        last_name="User",
        email="availability-model@example.com",
        username="availability_model",
        password_hash="x",
        availability=[{"day": "monday", "start_time": "09:00", "end_time": "17:00"}],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # The column, not the relationship.
    assert user.availability == [
        {"day": "monday", "start_time": "09:00", "end_time": "17:00"}
    ]
    # The relationship, under its own name, and empty until a row exists.
    assert user.availability_settings is None

    user.availability_settings = UserAvailability(timezone="Europe/London")
    db.commit()
    db.refresh(user)

    assert user.availability_settings.timezone == "Europe/London"
    assert user.availability_settings.user.id == user.id
    # Still the column.
    assert user.availability[0]["day"] == "monday"


@pytest.mark.parametrize("stored", [None, []])
def test_null_availability_serialises_as_an_empty_list(client, db, stored):
    """Rows predating the column's Python-side default hold NULL, not []."""
    from app.schemas.user import UserResponse

    user = User(
        first_name="Test",
        last_name="User",
        email=f"availability-null-{stored is None}@example.com",
        username=f"availability_null_{stored is None}",
        password_hash="x",
        availability=stored,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    assert UserResponse.model_validate(user).availability == []
