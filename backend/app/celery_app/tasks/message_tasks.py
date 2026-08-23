"""Celery tasks for messaging.

Scheduled messages (issue #973) are persisted immediately with
``is_sent=False`` and flushed by this periodic task once their scheduled
instant arrives. The beat schedule runs it every minute; the query itself
is idempotent and cheap, so a sparse schedule is fine.
"""

import logging

from app.celery_app.celery import celery_app
from app.database.session import SessionLocal
from app.services.message_service import MessageService

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name="app.celery_app.tasks.message_tasks.send_scheduled_messages",
)
def send_scheduled_messages(self):
    """Flush all due scheduled messages.

    A due message is one with ``is_sent=False`` and ``scheduled_for`` in
    the past. Each is back-dated to its scheduled instant, marked sent, and
    notifications are fired for the recipients.
    """
    db = SessionLocal()
    try:
        due = MessageService.list_due_scheduled_messages(db)
        sent = 0
        for db_message in due:
            try:
                MessageService.flush_scheduled_message(db, db_message)
                sent += 1
            except Exception:  # noqa: BLE001 - per-message isolation
                logger.exception("Failed to flush scheduled message %s", db_message.id)
                db.rollback()
                continue
        db.commit()
        if sent:
            logger.info("Flushed %d scheduled message(s).", sent)
        return sent
    except Exception as exc:
        logger.exception("Scheduled-message flush failed")
        db.rollback()
        raise self.retry(exc=exc)
    finally:
        db.close()
