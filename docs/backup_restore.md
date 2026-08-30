# DevLink Backup & Restore — User Data (#635)

DevLink lets users create a **portable, signed backup** of all their DevLink data
and restore it to the account it came from.

---

## Overview

| Feature | Details |
|---|---|
| **Backup format** | Signed JSON wrapped in a ZIP archive |
| **Integrity** | SHA-256 checksum — catches corruption |
| **Provenance** | HMAC-SHA256 signature, keyed server-side — catches tampering |
| **Restore strategy** | Bookmarks and skills are merged; profile fields are overwritten |
| **Scope** | A backup restores only into the account it was exported from |
| **Sensitive data** | Passwords, MFA secrets, tokens are **never** included |

---

## API Endpoints

All endpoints require a valid Bearer token (`Authorization: Bearer <token>`).

### `POST /api/v1/users/me/backup`
Create a full backup and **download** it as a `.zip` file.

**Response:** `application/zip` — contains `devlink_backup_<id>.json`

---

### `POST /api/v1/users/me/backup/meta`
Create a backup and receive only the **metadata** (no file download).

**Response:**
```json
{
  "success": true,
  "backup_id": "3fa85f64-...",
  "created_at": "2025-01-15T10:00:00Z",
  "message": "Backup created successfully..."
}
```

---

### `POST /api/v1/users/me/backup/validate`
Upload a backup JSON file to verify its **integrity and structure** before restoring.

**Request:** `multipart/form-data` — field `file` containing the JSON file.

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

If the file has been tampered with, `valid` will be `false` and `errors` will describe each problem.

---

### `POST /api/v1/users/me/backup/preview`
Preview what would be restored **without making any changes**.

**Request:** `multipart/form-data` — field `file`.

**Response:**
```json
{
  "backup_id": "3fa85f64-...",
  "created_at": "2025-01-15T10:00:00Z",
  "username": "alice",
  "records": {
    "profile_fields": 18,
    "projects": 4,
    "skills": 6,
    "bookmarks": 12,
    "messages": 87,
    "connections": 23,
    "organizations": 1,
    "applications": 3,
    "activities": 145,
    "notifications": 50,
    "builder_flares": 2
  }
}
```

---

### `POST /api/v1/users/me/backup/restore`
Restore user data from a backup file.

**Request:** `multipart/form-data` — field `file`.

**Response:**
```json
{
  "success": true,
  "message": "Backup restored successfully.",
  "restored": {
    "profile_fields": 3,
    "bookmarks": 8,
    "skills": 2
  }
}
```

---

## Backup File Format

The extracted JSON has three top-level sections:

```json
{
  "metadata": {
    "version": "1.0",
    "backup_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "created_at": "2025-01-15T10:00:00Z",
    "app_name": "DevLink",
    "user_id": "...",
    "username": "alice"
  },
  "checksum": "<sha256 of data section>",
  "signature": "<hmac-sha256 of data section>",
  "data": {
    "profile": { ... },
    "skills": [ ... ],
    "projects": [ ... ],
    "bookmarks": [ ... ],
    "messages": [ ... ],
    "connections": [ ... ],
    "organizations": [ ... ],
    "applications": [ ... ],
    "activities": [ ... ],
    "notifications": [ ... ],
    "builder_flares": [ ... ]
  }
}
```

> [!IMPORTANT]
> `checksum` and `signature` cover the same bytes — the `data` section serialised as JSON with keys sorted — and answer different questions.
>
> The **checksum** is an unkeyed SHA-256. It detects corruption: a truncated download, a mangled copy-paste. It cannot detect tampering, because it is a public function of the data and anyone editing the file can recompute it.
>
> The **signature** is an HMAC-SHA256 keyed with a server-side secret. It is what makes "this file came from this DevLink instance" a checkable claim, and it is what `restore` requires. Backups exported before signing was added have no `signature`; `preview` will still describe them, but they cannot be restored. Export a fresh one.

---

## Data Included in Backup

| Section | Included |
|---|---|
| Profile fields | ✅ All public and private profile fields |
| Skills | ✅ Skill associations + proficiency level |
| Projects | ✅ All owned projects |
| Bookmarks | ✅ All bookmarks |
| Messages | ✅ Up to 1,000 sent messages |
| Connections | ✅ Followers and following |
| Organizations | ✅ Owned organizations |
| Applications | ✅ All submitted applications |
| Activities | ✅ Up to 500 activity records |
| Notifications | ✅ Up to 500 notifications |
| Builder Flares | ✅ All posted flares |

---

## What Gets Restored

Bookmarks and skills are **merged** — nothing is deleted. Profile fields are **overwritten** from the file where present, which is the one part of a restore that replaces what is already there:

| Section | Restore behaviour |
|---|---|
| **Profile fields** | Mutable fields (bio, headline, location, etc.) **replace** the current value where the backup value differs. Each one is validated with the same model `PATCH /users/me` uses; a value that fails is skipped and logged rather than failing the whole restore |
| **Bookmarks** | Re-created for projects that still exist in DevLink |
| **Skills** | User-skill associations re-created for skills that still exist |
| Messages | **Not restored** — privacy/conversation ownership |
| Connections | **Not restored** — live social graph |
| Organizations | **Not restored** — require separate ownership transfer |
| Notifications | **Not restored** — ephemeral |

---

## Security Considerations

- Backup files **never** contain passwords, MFA secrets, refresh tokens, or API keys.
- The SHA-256 checksum detects corruption. It does **not** detect tampering — see the note on the payload format above.
- The HMAC signature detects tampering, and is required by `restore`.
- Only the **authenticated user** can create or restore their own backup.
- `metadata.user_id` is checked against the caller: restoring another account's backup file is a `403`, even if the file is perfectly valid.
- Uploads are capped at `MAX_BACKUP_UPLOAD_MB` (25 MB by default).

### Configuration

| Setting | Default | Purpose |
|---|---|---|
| `BACKUP_SIGNING_SECRET` | *(empty — falls back to `SECRET_KEY`)* | Key for the backup HMAC. Set separately to rotate backup signatures without invalidating every session. Rotating it invalidates existing backups. |
| `MAX_BACKUP_UPLOAD_MB` | `25` | Ceiling on an uploaded backup file. |

---

## Typical Workflow

1. **Download backup**: `POST /api/v1/users/me/backup` → save the `.zip` file.
2. **Extract JSON**: Unzip `devlink_backup_<username>.zip`.
3. *(Optional)* **Validate**: `POST /api/v1/users/me/backup/validate` with the JSON file.
4. *(Optional)* **Preview**: `POST /api/v1/users/me/backup/preview` to see what would change.
5. **Restore**: `POST /api/v1/users/me/backup/restore` with the JSON file.

---

## Running the Tests

```bash
cd backend
./venv/bin/pytest tests/test_backup_restore.py -v
```

Expected output: **21 passed**.
