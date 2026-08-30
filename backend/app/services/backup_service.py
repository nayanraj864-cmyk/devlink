"""
Backup & Restore Service (Issue #635)
======================================

Provides secure, versioned backup/restore of a user's DevLink data.

Backup format
─────────────
A JSON object written to an in-memory BytesIO buffer, optionally compressed
as a .zip archive for download.

  {
    "metadata": { version, backup_id, created_at, app_name, user_id, username },
    "checksum": "<sha256 of JSON-serialised data section>",
    "data": { … UserExportData … }
  }

Integrity
─────────
Two separate mechanisms, because they answer two different questions:

* ``checksum`` -- an unkeyed SHA-256 over the data section. It catches
  *corruption*: a truncated download, a mangled copy-paste. It cannot catch
  tampering, because it is a public function of the data and anyone editing
  the file can recompute it in three lines. It was documented as a tamper
  check, and restore leaned on that; see #1400.
* ``signature`` -- an HMAC-SHA256 over the same bytes, keyed with a
  server-side secret. This is the one that answers "did we write this file?",
  and it is the one restore requires.

Security
────────
* Restore requires a valid signature *and* that the backup's
  ``metadata.user_id`` matches the account restoring it.
* Restored profile fields go through ``UserUpdate``, the same validation the
  ``PATCH /users/me`` path uses. Values from a file do not reach ORM columns
  unvalidated.
* No sensitive credentials (passwords, MFA secrets) are included in the
  backup payload.
* Bookmarks and skills are merged: existing records are never deleted.
  Profile fields are *overwritten* from the file -- that step is not
  non-destructive, and the docs used to say it was.

Restore scope
─────────────
Currently restored:
  - Profile fields (bio, headline, location, website, etc.)
  - Bookmarks (re-created if the project still exists)
  - Skills (user-skill association re-created)

Items NOT restored (by design):
  - Messages (privacy / conversation ownership)
  - Notifications (ephemeral)
  - Connections / followers (social graph is live data)
  - Organizations (require separate owner transfer flow)
"""

from __future__ import annotations

import hashlib
import hmac
import io
import json
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings

from app.models.bookmark import Bookmark
from app.models.project import Project
from app.models.skill import Skill
from app.models.user import User
from app.models.user_skill import UserSkill
from app.schemas.backup import (
    BackupCreateResponse,
    BackupMetadata,
    BackupPayload,
    RestoreResponse,
    RestoreValidationError,
    RestoreValidationResponse,
)
from app.schemas.user import UserUpdate
from app.services.export_service import ExportService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _sha256(text: str) -> str:
    """
    Unkeyed digest of the data section.

    A corruption check, and only that. Both the writer and the checker compute
    the same public function of the same bytes, so a modified file with a
    recomputed digest passes -- which is why it is no longer what restore
    trusts. Kept because it still catches a truncated or mangled file, and
    because backups already in the wild carry one.
    """
    # codeql[py/weak-sensitive-data-hashing] These are high entropy tokens, not passwords
    return hashlib.sha256(text.encode()).hexdigest()


def _signing_key() -> bytes:
    """
    The key the backup HMAC is computed with.

    Falls back to ``SECRET_KEY``, which the application already requires, so
    this needs no new mandatory configuration. Setting
    ``BACKUP_SIGNING_SECRET`` separately lets backup signatures be rotated
    without invalidating every session.
    """
    secret = (settings.BACKUP_SIGNING_SECRET or "").strip() or settings.SECRET_KEY
    return secret.encode("utf-8")


def _sign(text: str) -> str:
    """
    HMAC-SHA256 over the data section, keyed server-side.

    This is the part a file's author cannot forge without the key, which is
    what makes "we wrote this file" a checkable claim rather than a hope.
    """
    return hmac.new(_signing_key(), text.encode("utf-8"), hashlib.sha256).hexdigest()


def _canonical_json(data: Any) -> str:
    """
    The exact byte sequence both the checksum and the signature cover.

    Written once so the create and validate paths cannot drift: a signature
    over slightly different bytes is a signature that never verifies, and the
    failure looks exactly like tampering.
    """
    return json.dumps(data, sort_keys=True, default=str)


def _serialize_export_data(data: Any) -> dict:
    """Convert a UserExportData pydantic model to a JSON-serialisable dict."""
    return json.loads(data.model_dump_json())


# ---------------------------------------------------------------------------
# BackupService
# ---------------------------------------------------------------------------


class BackupOwnershipError(PermissionError):
    """
    The backup belongs to a different account.

    Distinct from ``ValueError`` so the router can answer 403 rather than
    folding "not yours" into the 400 a malformed file gets.
    """


class BackupService:
    """
    High-level service for creating and restoring user data backups.
    """

    BACKUP_VERSION = "1.0"
    SUPPORTED_VERSIONS = {"1.0"}

    # ------------------------------------------------------------------ #
    #  CREATE BACKUP                                                       #
    # ------------------------------------------------------------------ #

    @classmethod
    def create_backup(
        cls, db: Session, user: User
    ) -> tuple[BackupCreateResponse, bytes]:
        """
        Collect all user data, build a signed backup payload, and return:
          - a BackupCreateResponse (API response body)
          - raw bytes of the zipped backup file (for streaming download)
        """
        export_data = ExportService.collect_user_data(db, user)
        data_dict = _serialize_export_data(export_data)
        data_json = _canonical_json(data_dict)
        checksum = _sha256(data_json)
        signature = _sign(data_json)

        now = datetime.now(timezone.utc)
        backup_id = str(uuid.uuid4())

        metadata = BackupMetadata(
            version=cls.BACKUP_VERSION,
            backup_id=backup_id,
            created_at=now,
            user_id=str(user.id),
            username=user.username,
        )

        payload = BackupPayload(
            metadata=metadata,
            checksum=checksum,
            signature=signature,
            data=data_dict,
        )

        zip_bytes = cls._build_zip(payload, backup_id)

        response = BackupCreateResponse(
            backup_id=backup_id,
            created_at=now,
            message="Backup created successfully. Use GET /me/backup/{backup_id} to download.",
        )

        return response, zip_bytes

    @classmethod
    def _build_zip(cls, payload: BackupPayload, backup_id: str) -> bytes:
        """Serialise the payload to JSON and wrap it in a ZIP archive."""
        payload_json = payload.model_dump_json(indent=2)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"devlink_backup_{backup_id}.json", payload_json)
        buffer.seek(0)
        return buffer.read()

    # ------------------------------------------------------------------ #
    #  VALIDATE BACKUP                                                     #
    # ------------------------------------------------------------------ #

    @classmethod
    def validate_backup(
        cls,
        payload: Any,
        *,
        require_signature: bool = True,
        expected_user_id: str | None = None,
    ) -> RestoreValidationResponse:
        """
        Validate the structure, integrity and provenance of a backup payload.

        Three distinct questions, answered in order, because a later answer is
        only meaningful once the earlier ones hold:

        1. **Is it shaped like a backup?** Missing or wrongly-typed sections
           stop here. ``payload["metadata"].get(...)`` used to run against
           whatever ``metadata`` happened to be, so a file with a string there
           raised ``AttributeError`` and a 500 rather than a validation error.
        2. **Did it arrive intact?** The checksum, which catches corruption.
        3. **Did we write it, and is it this account's?** The signature and
           ``metadata.user_id``.

        ``require_signature=False`` exists for the preview endpoint, which
        makes no changes and should still be able to describe an old
        unsigned file. Restore never passes it.
        """
        errors: list[RestoreValidationError] = []

        if not isinstance(payload, dict):
            return RestoreValidationResponse(
                valid=False,
                errors=[
                    RestoreValidationError(
                        field="payload",
                        message="Backup must be a JSON object.",
                    )
                ],
            )

        # --- 1. Shape -----------------------------------------------------
        for key in ("metadata", "checksum", "data"):
            if key not in payload:
                errors.append(
                    RestoreValidationError(
                        field=key,
                        message=f"Required field '{key}' is missing from backup.",
                    )
                )

        if errors:
            return RestoreValidationResponse(valid=False, errors=errors)

        metadata = payload.get("metadata")
        if not isinstance(metadata, dict):
            errors.append(
                RestoreValidationError(
                    field="metadata",
                    message="'metadata' must be an object.",
                )
            )

        data_section = payload.get("data")
        if not isinstance(data_section, dict):
            errors.append(
                RestoreValidationError(
                    field="data",
                    message="'data' must be an object.",
                )
            )

        if errors:
            return RestoreValidationResponse(valid=False, errors=errors)

        version = metadata.get("version")
        if version not in cls.SUPPORTED_VERSIONS:
            errors.append(
                RestoreValidationError(
                    field="metadata.version",
                    message=(
                        f"Unsupported backup version '{version}'. "
                        f"Supported: {sorted(cls.SUPPORTED_VERSIONS)}"
                    ),
                )
            )

        # --- 2. Integrity -------------------------------------------------
        data_json = _canonical_json(data_section)
        actual_checksum = payload.get("checksum")

        if not isinstance(actual_checksum, str) or not hmac.compare_digest(
            _sha256(data_json), actual_checksum
        ):
            errors.append(
                RestoreValidationError(
                    field="checksum",
                    message=(
                        "Checksum mismatch. The backup file is corrupt or "
                        "incomplete."
                    ),
                )
            )

        # --- 3. Provenance ------------------------------------------------
        if require_signature:
            signature = payload.get("signature")
            if not isinstance(signature, str) or not signature:
                errors.append(
                    RestoreValidationError(
                        field="signature",
                        message=(
                            "Backup is unsigned. Only backups produced by this "
                            "DevLink instance can be restored; export a fresh "
                            "one from Settings."
                        ),
                    )
                )
            elif not hmac.compare_digest(_sign(data_json), signature):
                errors.append(
                    RestoreValidationError(
                        field="signature",
                        message=(
                            "Signature does not match the backup contents. The "
                            "file has been modified since it was exported."
                        ),
                    )
                )

        if expected_user_id is not None:
            owner = metadata.get("user_id")
            if not owner:
                # A file that does not say whose it is, is malformed rather
                # than someone else's. The two get different fields so the
                # caller can answer 400 for one and 403 for the other.
                errors.append(
                    RestoreValidationError(
                        field="metadata.user_id",
                        message=(
                            "Backup metadata does not record which account it "
                            "belongs to."
                        ),
                    )
                )
            elif str(owner) != str(expected_user_id):
                errors.append(
                    RestoreValidationError(
                        field="ownership",
                        message=(
                            "This backup belongs to a different account and "
                            "cannot be restored here."
                        ),
                    )
                )

        return RestoreValidationResponse(valid=len(errors) == 0, errors=errors)

    # ------------------------------------------------------------------ #
    #  RESTORE BACKUP                                                      #
    # ------------------------------------------------------------------ #

    @classmethod
    def restore_backup(cls, db: Session, user: User, payload: dict) -> RestoreResponse:
        """
        Apply a validated backup payload to the current user's account.

        Restore strategy:
          1. Profile fields – **overwritten** from the file where present and
             valid. This step is not a merge, and the docs used to say it was.
          2. Bookmarks – additive; re-created where the project still exists.
          3. Skills – additive; associations re-created where the skill still
             exists.

        Nothing is deleted, but a profile field present in the backup replaces
        the current one.

        Returns a RestoreResponse with counts of restored items.

        Raises ``BackupOwnershipError`` when the file belongs to another
        account, so the router can answer 403 rather than folding it into the
        400 that a malformed file gets. ``metadata.user_id`` was written on
        export and never read on import, so any account's export file applied
        cleanly to any other account.
        """
        validation = cls.validate_backup(payload, expected_user_id=str(user.id))
        if not validation.valid:
            if any(e.field == "ownership" for e in validation.errors):
                raise BackupOwnershipError(
                    "This backup belongs to a different account."
                )
            error_msgs = "; ".join(e.message for e in validation.errors)
            raise ValueError(f"Invalid backup: {error_msgs}")

        data = payload["data"]
        restored: dict[str, int] = {}

        # 1. Profile
        profile_count = cls._restore_profile(db, user, data.get("profile", {}))
        restored["profile_fields"] = profile_count

        # 2. Bookmarks
        bookmark_count = cls._restore_bookmarks(db, user, data.get("bookmarks", []))
        restored["bookmarks"] = bookmark_count

        # 3. Skills
        skill_count = cls._restore_skills(db, user, data.get("skills", []))
        restored["skills"] = skill_count

        db.commit()

        return RestoreResponse(
            success=True,
            message="Backup restored successfully.",
            restored=restored,
        )

    # ------------------------------------------------------------------ #
    #  Private restore helpers                                             #
    # ------------------------------------------------------------------ #

    # Profile fields a backup may write. Every one of them is also a field on
    # ``UserUpdate``, which is what makes routing them through it possible.
    RESTORABLE_FIELDS = (
        "headline",
        "bio",
        "location",
        "timezone",
        "website",
        "portfolio_url",
        "public_email",
        "github_url",
        "linkedin_url",
        "company",
        "experience_level",
        "open_to_work",
    )

    @classmethod
    def _restore_profile(cls, db: Session, user: User, profile: Any) -> int:
        """
        Update mutable profile fields from the backup. Returns the count.

        The values go through ``UserUpdate`` first -- the same model
        ``PATCH /users/me`` validates against -- so a backup cannot write
        something the ordinary profile form would reject. They used to be
        ``setattr``-ed straight onto the ORM: a ``javascript:`` URL in
        ``website``, a string longer than its column, an ``experience_level``
        outside the enum, all landed unexamined.

        A field that fails validation is skipped and logged rather than
        failing the whole restore, so one bad value in an otherwise good
        backup does not cost the user their bookmarks and skills.
        """
        if not isinstance(profile, dict):
            return 0

        candidate = {
            field: profile[field]
            for field in cls.RESTORABLE_FIELDS
            if field in profile and profile[field] is not None
        }
        if not candidate:
            return 0

        validated = cls._validate_profile_fields(candidate)

        updated = 0
        for field, new_val in validated.items():
            if getattr(user, field, None) != new_val:
                setattr(user, field, new_val)
                updated += 1

        db.add(user)
        return updated

    @classmethod
    def _validate_profile_fields(cls, candidate: dict) -> dict:
        """
        Run candidate profile values through ``UserUpdate``.

        Tried as one model first, because that is the cheap path. If it fails,
        each field is tried alone so that the rest of a mostly-valid backup
        still applies and the rejected field can be named in the log.
        """
        try:
            model = UserUpdate(**candidate)
        except ValidationError:
            pass
        else:
            return {
                field: getattr(model, field)
                for field in candidate
                if getattr(model, field, None) is not None
            }

        accepted: dict = {}
        for field, value in candidate.items():
            try:
                model = UserUpdate(**{field: value})
            except ValidationError as exc:
                logger.warning(
                    "Skipping profile field %r from backup: %s",
                    field,
                    exc.errors()[0].get("msg") if exc.errors() else exc,
                )
                continue
            resolved = getattr(model, field, None)
            if resolved is not None:
                accepted[field] = resolved
        return accepted

    @staticmethod
    def _restore_bookmarks(db: Session, user: User, bookmarks: list[dict]) -> int:
        """Re-create bookmarks for projects that still exist. Returns count created."""
        if not bookmarks:
            return 0

        # Get existing bookmark project_ids for this user
        existing = {
            str(b.project_id)
            for b in db.query(Bookmark).filter(Bookmark.user_id == user.id).all()
        }

        created = 0
        for bk in bookmarks:
            project_id_str = bk.get("project_id")
            if not project_id_str or project_id_str in existing:
                continue
            try:
                project_id = uuid.UUID(project_id_str)
            except (ValueError, AttributeError):
                continue

            # Only restore if project still exists in DB
            project = db.get(Project, project_id)
            if project is None:
                continue

            new_bookmark = Bookmark(
                id=uuid.uuid4(),
                user_id=user.id,
                project_id=project_id,
            )
            db.add(new_bookmark)
            existing.add(project_id_str)
            created += 1

        return created

    @staticmethod
    def _restore_skills(db: Session, user: User, skills: list[dict]) -> int:
        """Re-create user-skill associations that no longer exist. Returns count created."""
        if not skills:
            return 0

        # Get existing skill ids for this user
        existing_skill_ids = {
            str(us.skill_id)
            for us in db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
        }

        created = 0
        for sk in skills:
            skill_id_str = str(sk.get("id", ""))
            if not skill_id_str or skill_id_str in existing_skill_ids:
                continue
            try:
                skill_id = uuid.UUID(skill_id_str)
            except (ValueError, AttributeError):
                continue

            # Only restore if skill still exists in DB
            skill = db.get(Skill, skill_id)
            if skill is None:
                continue

            new_us = UserSkill(
                id=uuid.uuid4(),
                user_id=user.id,
                skill_id=skill_id,
            )
            db.add(new_us)
            existing_skill_ids.add(skill_id_str)
            created += 1

        return created

    # ------------------------------------------------------------------ #
    #  PREVIEW RESTORE                                                     #
    # ------------------------------------------------------------------ #

    @classmethod
    def preview_restore(cls, payload: dict) -> dict[str, Any]:
        """
        Return a preview of what would be restored without making DB changes.
        """
        data = payload.get("data") or {}
        meta = payload.get("metadata") or {}
        if not isinstance(data, dict):
            data = {}
        if not isinstance(meta, dict):
            meta = {}
        return {
            "backup_id": meta.get("backup_id", "unknown"),
            "created_at": meta.get("created_at"),
            "username": meta.get("username"),
            "signed": bool(payload.get("signature")),
            "records": {
                "profile_fields": len(data.get("profile") or {}),
                "projects": len(data.get("projects") or []),
                "skills": len(data.get("skills") or []),
                "bookmarks": len(data.get("bookmarks") or []),
                "messages": len(data.get("messages") or []),
                "connections": len(data.get("connections") or []),
                "organizations": len(data.get("organizations") or []),
                "applications": len(data.get("applications") or []),
                "activities": len(data.get("activities") or []),
                "notifications": len(data.get("notifications") or []),
                "builder_flares": len(data.get("builder_flares") or []),
            },
        }
