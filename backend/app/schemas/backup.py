"""
Pydantic schemas for the Backup & Restore system (Issue #635).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Backup metadata
# ---------------------------------------------------------------------------


class BackupMetadata(BaseModel):
    """Header section included in every backup file."""

    version: str = "1.0"
    backup_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime
    app_name: str = "DevLink"
    user_id: str
    username: str


# ---------------------------------------------------------------------------
# Backup payload (same structure as UserExportData but with checksum)
# ---------------------------------------------------------------------------


class BackupPayload(BaseModel):
    """
    Full serialisable backup payload written to disk / returned to client.

    ``checksum`` and ``signature`` cover the same bytes and answer different
    questions. The checksum is unkeyed, so it detects corruption but not
    tampering -- anyone editing the file can recompute it. The signature is an
    HMAC keyed with a server-side secret, which is what makes "this file came
    from us" checkable. Restore requires the signature; see #1400.
    """

    metadata: BackupMetadata
    checksum: str  # SHA-256 hex digest of the *data* section JSON string
    signature: str | None = None  # HMAC-SHA256 over the same string
    data: dict[str, Any]  # serialised UserExportData


# ---------------------------------------------------------------------------
# API responses
# ---------------------------------------------------------------------------


class BackupCreateResponse(BaseModel):
    """Returned when a backup is successfully generated."""

    success: bool = True
    backup_id: str
    created_at: datetime
    message: str = "Backup created successfully. Download it using the backup_id."


class RestorePreview(BaseModel):
    """Summary shown before a restore is actually applied."""

    backup_id: str
    created_at: datetime
    username: str
    records: dict[str, int]  # {"projects": 5, "bookmarks": 12, …}


class RestoreResponse(BaseModel):
    """Returned after a restore operation."""

    success: bool = True
    message: str
    restored: dict[str, int]  # counts of restored items per category


class RestoreRequest(BaseModel):
    """Body accepted by the restore endpoint (JSON upload path)."""

    payload: dict[str, Any]


# ---------------------------------------------------------------------------
# Import / validation errors
# ---------------------------------------------------------------------------


class RestoreValidationError(BaseModel):
    field: str
    message: str


class RestoreValidationResponse(BaseModel):
    valid: bool
    errors: list[RestoreValidationError] = []
