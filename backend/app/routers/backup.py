"""
Backup & Restore API Router (Issue #635)
=========================================

Endpoints
─────────
POST   /api/v1/users/me/backup            Create a backup and download the zip
GET    /api/v1/users/me/backup/validate   Validate an uploaded backup JSON
POST   /api/v1/users/me/backup/preview    Preview what would be restored
POST   /api/v1/users/me/backup/restore    Restore from an uploaded backup JSON
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies import get_current_active_user, get_database
from app.models.user import User
from app.schemas.backup import (
    BackupCreateResponse,
    RestoreResponse,
    RestoreValidationResponse,
)
from app.services.backup_service import BackupOwnershipError, BackupService

router = APIRouter(prefix="/users/me/backup", tags=["Backup & Restore"])


async def _read_backup_upload(file: UploadFile) -> dict:
    """
    Read an uploaded backup and parse it, with a ceiling.

    All three upload endpoints used to do a bare ``await file.read()``: no
    size limit, no streaming, the whole file resident before anything looked
    at it. The upload has to be materialised to be parsed as JSON, so the
    ceiling is the honest way to bound that -- read one byte past the limit
    and refuse if it arrives.
    """
    max_bytes = settings.MAX_BACKUP_UPLOAD_MB * 1024 * 1024
    raw = await file.read(max_bytes + 1)

    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Backup file exceeds the {settings.MAX_BACKUP_UPLOAD_MB} MB limit."
            ),
        )

    if not raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Backup file is empty.",
        )

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid JSON: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# POST /users/me/backup
# ---------------------------------------------------------------------------


@router.post(
    "",
    summary="Create and download a full data backup",
    description=(
        "Generates a signed, versioned ZIP archive containing all of the "
        "authenticated user's DevLink data (profile, projects, bookmarks, "
        "skills, messages, connections, organizations, etc.). "
        "The archive can later be used to restore your account."
    ),
    response_class=Response,
    responses={
        200: {
            "content": {"application/zip": {}},
            "description": "ZIP file containing the backup JSON.",
        }
    },
)
def create_backup(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_database),
) -> Response:
    _, zip_bytes = BackupService.create_backup(db, current_user)
    filename = f"devlink_backup_{current_user.username}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# POST /users/me/backup/meta  (JSON metadata only, no file download)
# ---------------------------------------------------------------------------


@router.post(
    "/meta",
    response_model=BackupCreateResponse,
    summary="Create a backup and get its metadata",
    description=(
        "Creates a backup and returns its metadata (backup_id, created_at). "
        "Use this if you need only the metadata without downloading the file."
    ),
)
def create_backup_meta(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_database),
) -> BackupCreateResponse:
    response, _ = BackupService.create_backup(db, current_user)
    return response


# ---------------------------------------------------------------------------
# POST /users/me/backup/validate
# ---------------------------------------------------------------------------


@router.post(
    "/validate",
    response_model=RestoreValidationResponse,
    summary="Validate a backup file",
    description=(
        "Upload a backup JSON file (extracted from the ZIP) to verify its "
        "integrity (checksum) and structural validity before restoring."
    ),
)
async def validate_backup(
    file: UploadFile = File(..., description="The devlink_backup_<id>.json file"),
    current_user: User = Depends(get_current_active_user),
) -> RestoreValidationResponse:
    payload = await _read_backup_upload(file)
    # The same checks restore will run, reported rather than raised, so the
    # answer here and the outcome there cannot disagree.
    return BackupService.validate_backup(
        payload, expected_user_id=str(current_user.id)
    )


# ---------------------------------------------------------------------------
# POST /users/me/backup/preview
# ---------------------------------------------------------------------------


@router.post(
    "/preview",
    summary="Preview what would be restored",
    description=(
        "Upload a backup JSON file and receive a summary of the records "
        "it contains, without making any changes to your account."
    ),
)
async def preview_restore(
    file: UploadFile = File(..., description="The devlink_backup_<id>.json file"),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    payload = await _read_backup_upload(file)

    # Preview changes nothing, so it will describe an older unsigned file
    # rather than refuse it -- the response carries `signed` so the caller can
    # see that restoring it will not work. Structure and checksum still have
    # to hold, or there is nothing coherent to describe.
    validation = BackupService.validate_backup(payload, require_signature=False)
    if not validation.valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Backup validation failed",
                "errors": [e.model_dump() for e in validation.errors],
            },
        )

    return BackupService.preview_restore(payload)


# ---------------------------------------------------------------------------
# POST /users/me/backup/restore
# ---------------------------------------------------------------------------


@router.post(
    "/restore",
    response_model=RestoreResponse,
    summary="Restore user data from a backup",
    description=(
        "Upload a valid backup JSON file to restore your DevLink data. "
        "This is a **non-destructive merge**: existing records are never "
        "deleted. Only missing bookmarks and skills are re-created, and "
        "mutable profile fields are updated from the backup."
    ),
)
async def restore_backup(
    file: UploadFile = File(..., description="The devlink_backup_<id>.json file"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_database),
) -> RestoreResponse:
    payload = await _read_backup_upload(file)

    try:
        return BackupService.restore_backup(db, current_user, payload)
    except BackupOwnershipError as exc:
        # Not "your file is malformed" -- it is well-formed and belongs to
        # someone else.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
