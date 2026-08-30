# Project Invitation Expiration (#1312)

Pending project invitations expire after a configurable period.

## Storage

- Column: `project_members.expires_at` (`TIMESTAMP WITH TIME ZONE`, nullable)
- Set when an invitation is created (`is_active=False`)
- Duration: `PROJECT_INVITATION_EXPIRE_DAYS` (default `7`)

## Status

Invitation status is derived and returned by the API:

| Status | Meaning |
|---|---|
| `pending` | Inactive membership whose `expires_at` is still in the future, or is unset |
| `expired` | Inactive membership whose `expires_at` is in the past |
| `accepted` | Active membership (`is_active=True`) |

Exposed on:

- `POST /api/v1/projects/{project_id}/invite/{user_id}` (`status`, `expires_at`)
- `POST /api/v1/projects/{project_id}/invitations/accept` (`status`, `expires_at`)
- `GET /api/v1/projects/{project_id}/dashboard` → `pending_invitations[].status` / `expires_at`

## Acceptance

`POST /api/v1/projects/{project_id}/invitations/accept` rejects an expired invitation with `400` and detail `Invitation has expired`. Expiration is enforced at accept time, so leftover expired rows cannot be used to join.

## Cleanup strategy

Expired invitations are already unusable. Cleanup is for storage hygiene, not access control.

1. **Accept-time rejection** — the API refuses expired rows immediately. This is the security boundary.
2. **Periodic delete** — on a schedule (daily is enough), delete inactive memberships that have expired:

```sql
DELETE FROM project_members
WHERE is_active = false
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
```

3. **Rows with `expires_at` NULL** — treated as non-expiring. Backfill or delete them separately if they should follow the TTL.

4. **Do not delete accepted members** — `is_active = true` rows are real memberships; `expires_at` on those rows is ignored.
