# Advanced Messaging Features (#973)

Issue #973 adds the advanced messaging features to the chat experience:

- Message scheduling
- Pin messages
- Edit / delete messages
- Voice notes
- Global message search

---

## 1. Database Model & Schema Updates

### `Message` model (`backend/app/models/message.py`)
New columns added for the feature set:

| Column | Type | Notes |
| --- | --- | --- |
| `is_sent` | `bool`, default `true`, indexed | `false` while a scheduled message waits for its delivery time |
| `scheduled_for` | `datetime | None`, indexed | UTC instant the message should be delivered |
| `is_pinned` | `bool`, default `false`, indexed | whether the message is pinned in its conversation |
| `pinned_by_id` | `UUID FK users`, nullable | user who pinned the message |
| `pinned_at` | `datetime`, nullable | when the message was pinned |

`MessageType.VOICE` was added for voice notes (the audio file is stored via the
attachment upload endpoint and referenced by `attachment_url`).

### API Schemas (`backend/app/schemas/message.py`)
- `MessageCreate.scheduled_for`: optional UTC `datetime`; when set the message is
  persisted as a draft (`is_sent=false`) and flushed by the scheduler later.
- `MessageResponse` now includes `is_sent`, `scheduled_for`, `is_pinned`,
  `pinned_by_id`, `pinned_at`.

---

## 2. API Endpoints

### Scheduling
- `POST /api/messages` — set `scheduled_for` in the body to schedule. If the time
  is in the past the request is rejected (`400`).
- `GET /api/messages/scheduled` — list the current user's not-yet-sent scheduled
  messages.
- `DELETE /api/messages/scheduled/{message_id}` — cancel a scheduled message
  (soft-deletes it; `400` if already sent).

Scheduled messages are hidden from the conversation thread until they are sent.

### Pinning
- `GET /api/messages/conversation/{conversation_id}/pinned` — list pinned messages
  in a conversation.
- `PATCH /api/messages/{message_id}/pin` — pin a message (records `pinned_by_id`
  and `pinned_at`).
- `PATCH /api/messages/{message_id}/unpin` — unpin a message.

### Edit / Delete (ownership enforced)
Edit, delete, and restore now require the caller to be the message sender:

- `PUT /api/messages/{message_id}` — edit own message (`404` if not found,
  `403` if not the owner, `400` if editing a deleted message).
- `DELETE /api/messages/{message_id}` — soft-delete own message.
- `PATCH /api/messages/{message_id}/restore` — restore a soft-deleted message.

### Voice notes
- Upload the audio clip with `POST /api/media/upload-attachment`, then send a
  message with `"type": "voice"` and the returned `attachment_url`.

### Global message search
- `GET /api/messages/search?q=<query>` — full-text-ish search across every
  conversation the current user belongs to.

---

## 3. Scheduled Delivery (Celery)

`backend/app/celery_app/tasks/message_tasks.py` exposes the periodic task
`send_scheduled_messages`, registered in `backend/app/celery_app/celery.py`:

- Runs on the beat schedule every **60 seconds**.
- Flushes every message with `is_sent=false` and `scheduled_for <= now`.
- Back-dates `created_at` to the scheduled instant, marks the message sent,
  clears the draft, and fires recipient notifications.
- Each message is flushed in its own try/except so one failure never blocks the
  rest of the batch.

---

## 4. Frontend

- `frontend/src/api/modules/messages.ts` — API bindings for schedule / scheduled
  list / cancel, pin / unpin, pinned list, edit, delete, and global search.
- `frontend/src/services/index.ts` — maps the new backend fields (`is_sent`,
  `scheduled_for`, `is_pinned`, `read_at`, …) into the UI `Message` shape and
  exposes the matching service methods.
- `frontend/src/routes/_app.messages.$conversationId.tsx`:
  - action menu on hover per message (edit / delete for own messages, pin / unpin)
  - pinned-messages banner under the thread header
  - read-receipt ticks on own messages
  - voice-note recorder (MediaRecorder → upload → send as `type: voice`)
  - schedule picker (datetime-local) in the composer
- `frontend/src/routes/_app.messages.tsx` — global message search box in the
  sidebar with debounced results.

---

## 5. Tests

`backend/tests/test_advanced_messaging.py` covers scheduling (hide from thread,
past-time rejection, list, cancel, flush), pin/unpin, edit/delete ownership
(`403`/`400`), voice message sends, and global search.

`backend/tests/conftest.py` runs Celery tasks eagerly (`CELERY_TASK_ALWAYS_EAGER`)
so the suite does not require a live broker.
