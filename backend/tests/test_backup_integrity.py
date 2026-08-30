"""
Tests for issue #1400: backup provenance, ownership and validation.

The module docstring used to promise that "the checksum prevents tampering:
if the data section is modified after export, the restore endpoint rejects
the file". It did not. The checksum is an unkeyed SHA-256 that both the writer
and the checker compute from the data, so editing the file and recomputing it
is three lines — and restore leaned on that promise while writing profile
fields straight onto the ORM.

So the first test here is the one that used to pass and should not have:
tamper with the data, recompute the digest, and watch it be refused.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services.backup_service import (
    BackupOwnershipError,
    BackupService,
    _canonical_json,
    _sha256,
    _sign,
)

pytestmark = pytest.mark.usefixtures("setup_db")


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


def _user(user_id: uuid.UUID | None = None, username: str = "owner") -> MagicMock:
    u = MagicMock()
    u.id = user_id or uuid.uuid4()
    u.username = username
    u.bio = "old bio"
    u.headline = "old headline"
    u.website = None
    u.public_email = None
    u.github_url = None
    u.linkedin_url = None
    u.portfolio_url = None
    u.company = None
    u.location = None
    u.timezone = None
    u.experience_level = None
    u.open_to_work = False
    return u


def _payload(owner: MagicMock, data: dict | None = None, *, sign: bool = True) -> dict:
    if data is None:
        data = {"profile": {}, "bookmarks": [], "skills": []}
    data_json = _canonical_json(data)
    payload = {
        "metadata": {
            "version": "1.0",
            "backup_id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "app_name": "DevLink",
            "user_id": str(owner.id),
            "username": owner.username,
        },
        "checksum": _sha256(data_json),
        "data": data,
    }
    if sign:
        payload["signature"] = _sign(data_json)
    return payload


def _reseal_checksum_only(payload: dict) -> dict:
    """Edit-and-recompute, exactly as an attacker with the file would."""
    payload["checksum"] = _sha256(_canonical_json(payload["data"]))
    return payload


def _fields(result) -> set[str]:
    return {e.field for e in result.errors}


# --------------------------------------------------------------------------
# The checksum is not a tamper check
# --------------------------------------------------------------------------


def test_recomputing_the_checksum_no_longer_gets_a_file_accepted():
    """
    The bug, in one test. Anyone with the file can recompute the digest.
    """
    owner = _user()
    payload = _payload(owner)
    payload["data"]["profile"] = {"headline": "injected"}
    _reseal_checksum_only(payload)

    result = BackupService.validate_backup(payload)

    assert result.valid is False
    assert "signature" in _fields(result)


def test_a_correctly_signed_backup_is_accepted():
    owner = _user()
    result = BackupService.validate_backup(_payload(owner))
    assert result.valid is True, result.errors


def test_a_backup_created_by_the_service_validates():
    owner = _user()
    with patch(
        "app.services.backup_service.ExportService.collect_user_data"
    ) as collect:
        collect.return_value = MagicMock(
            model_dump_json=lambda: json.dumps({"profile": {"username": "owner"}})
        )
        _, zip_bytes = BackupService.create_backup(MagicMock(), owner)

    import io
    import zipfile

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        payload = json.loads(zf.read(zf.namelist()[0]))

    assert BackupService.validate_backup(payload).valid is True


def test_an_unsigned_backup_is_refused_with_a_useful_message():
    owner = _user()
    payload = _payload(owner, sign=False)

    result = BackupService.validate_backup(payload)

    assert result.valid is False
    errors = {e.field: e.message for e in result.errors}
    assert "signature" in errors
    assert "unsigned" in errors["signature"].lower()


def test_a_signature_from_a_different_key_is_refused():
    owner = _user()
    payload = _payload(owner)
    payload["signature"] = "0" * 64

    result = BackupService.validate_backup(payload)

    assert result.valid is False
    assert "signature" in _fields(result)


def test_a_truncated_file_still_fails_the_checksum():
    """The checksum keeps its real job: catching corruption."""
    owner = _user()
    payload = _payload(owner)
    payload["data"]["bookmarks"] = [{"project_id": str(uuid.uuid4())}]

    result = BackupService.validate_backup(payload)

    assert result.valid is False
    assert "checksum" in _fields(result)


def test_preview_accepts_an_unsigned_backup_but_says_so():
    """
    Preview changes nothing, so it describes an older file rather than
    refusing it -- and reports that restoring it will not work.
    """
    owner = _user()
    payload = _payload(owner, sign=False)

    result = BackupService.validate_backup(payload, require_signature=False)
    assert result.valid is True

    assert BackupService.preview_restore(payload)["signed"] is False


# --------------------------------------------------------------------------
# Ownership
# --------------------------------------------------------------------------


def test_another_accounts_backup_is_refused():
    """
    `metadata.user_id` was written on export and never read on import, so any
    account's export applied cleanly to any other account.
    """
    theirs = _user(username="them")
    mine = _user(username="me")

    with pytest.raises(BackupOwnershipError):
        BackupService.restore_backup(MagicMock(), mine, _payload(theirs))


def test_your_own_backup_restores():
    me = _user()
    db = MagicMock()

    response = BackupService.restore_backup(db, me, _payload(me))

    assert response.success is True


def test_a_backup_that_does_not_say_whose_it_is_is_malformed_not_forbidden():
    """
    Distinct from the case above, and answered with 400 rather than 403: a
    file with no owner recorded is broken, not someone else's.
    """
    me = _user()
    payload = _payload(me)
    del payload["metadata"]["user_id"]

    with pytest.raises(ValueError) as exc:
        BackupService.restore_backup(MagicMock(), me, payload)
    assert not isinstance(exc.value, BackupOwnershipError)


def test_ownership_is_reported_under_its_own_field():
    theirs = _user()
    result = BackupService.validate_backup(
        _payload(theirs), expected_user_id=str(uuid.uuid4())
    )
    assert "ownership" in _fields(result)


# --------------------------------------------------------------------------
# Malformed structures are errors, not 500s
# --------------------------------------------------------------------------


@pytest.mark.parametrize("metadata", ["a string", 42, ["a", "list"], None])
def test_a_non_object_metadata_is_a_validation_error(metadata):
    """
    `payload["metadata"].get("version")` ran against whatever was there. A
    string raised `AttributeError`, which is a 500 from all three endpoints.
    """
    result = BackupService.validate_backup(
        {"metadata": metadata, "checksum": "x", "data": {}}
    )
    assert result.valid is False
    assert "metadata" in _fields(result)


@pytest.mark.parametrize("data", ["a string", 42, ["a", "list"]])
def test_a_non_object_data_section_is_a_validation_error(data):
    result = BackupService.validate_backup(
        {"metadata": {"version": "1.0"}, "checksum": "x", "data": data}
    )
    assert result.valid is False
    assert "data" in _fields(result)


@pytest.mark.parametrize("payload", ["a string", 42, ["a", "list"], None])
def test_a_non_object_payload_is_a_validation_error(payload):
    result = BackupService.validate_backup(payload)
    assert result.valid is False
    assert "payload" in _fields(result)


def test_a_non_string_checksum_does_not_crash_the_comparison():
    owner = _user()
    payload = _payload(owner)
    payload["checksum"] = 12345

    result = BackupService.validate_backup(payload)
    assert result.valid is False
    assert "checksum" in _fields(result)


def test_preview_survives_a_data_section_full_of_wrong_types():
    payload = {
        "metadata": {"backup_id": "b", "username": "u"},
        "data": {"projects": None, "skills": None, "profile": None},
    }
    preview = BackupService.preview_restore(payload)
    assert preview["records"]["projects"] == 0
    assert preview["records"]["profile_fields"] == 0


# --------------------------------------------------------------------------
# Restored profile fields go through the ordinary validator
# --------------------------------------------------------------------------


def _restore_profile(profile: dict):
    user = _user()
    db = MagicMock()
    updated = BackupService._restore_profile(db, user, profile)
    return user, updated


def test_a_valid_profile_field_is_applied():
    user, updated = _restore_profile({"headline": "Staff Engineer"})
    assert user.headline == "Staff Engineer"
    assert updated == 1


def test_a_javascript_url_never_reaches_the_column():
    """
    `website` was `setattr`-ed straight onto the ORM from the file.
    """
    user, _ = _restore_profile({"website": "javascript:alert(1)"})
    assert user.website is None


@pytest.mark.parametrize(
    "value",
    [
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD4=",
        "not a url at all",
    ],
)
def test_hostile_url_values_are_skipped(value):
    user, _ = _restore_profile({"github_url": value})
    assert user.github_url is None


def test_a_malformed_email_is_skipped():
    user, _ = _restore_profile({"public_email": "not-an-email"})
    assert user.public_email is None


def test_one_bad_field_does_not_discard_the_good_ones():
    """
    A restore is the thing someone reaches for after losing data. Failing the
    whole operation over one bad value would be the wrong trade.
    """
    user, updated = _restore_profile(
        {"headline": "Staff Engineer", "website": "javascript:alert(1)"}
    )
    assert user.headline == "Staff Engineer"
    assert user.website is None
    assert updated == 1


def test_a_non_object_profile_section_restores_nothing():
    user = _user()
    assert BackupService._restore_profile(MagicMock(), user, "not a dict") == 0


def test_fields_outside_the_allow_list_are_ignored():
    user = _user()
    user.role = "user"
    BackupService._restore_profile(
        MagicMock(), user, {"role": "admin", "is_verified": True}
    )
    assert user.role == "user"


def test_unchanged_values_are_not_counted_as_updates():
    user = _user()
    user.headline = "Staff Engineer"
    updated = BackupService._restore_profile(
        MagicMock(), user, {"headline": "Staff Engineer"}
    )
    assert updated == 0


# --------------------------------------------------------------------------
# Signing key
# --------------------------------------------------------------------------


def test_signatures_do_not_verify_across_keys(monkeypatch):
    owner = _user()
    monkeypatch.setattr(
        "app.services.backup_service.settings.BACKUP_SIGNING_SECRET",
        "first-key-first-key-first-key-01",
    )
    payload = _payload(owner)

    monkeypatch.setattr(
        "app.services.backup_service.settings.BACKUP_SIGNING_SECRET",
        "second-key-second-key-second-k02",
    )
    result = BackupService.validate_backup(payload)

    assert result.valid is False
    assert "signature" in _fields(result)


def test_an_empty_signing_secret_falls_back_to_the_app_secret(monkeypatch):
    """
    So this needs no new mandatory configuration to be safe by default.
    """
    monkeypatch.setattr(
        "app.services.backup_service.settings.BACKUP_SIGNING_SECRET", ""
    )
    owner = _user()
    assert BackupService.validate_backup(_payload(owner)).valid is True
