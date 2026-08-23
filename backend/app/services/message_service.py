from __future__ import annotations

import time
import uuid
from datetime import datetime
from app.utils.time import utcnow
from typing import Dict, Tuple

# pyrefly: ignore [missing-import]
from sqlalchemy import select, func

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session, selectinload

from app.models.conversation_member import ConversationMember
from app.models.message import Message
from app.models.user import User
from app.schemas.message import (
    MessageCreate,
    MessageUpdate,
)
from app.services.notification_service import NotificationService


from app.services.block_service import BlockService
from fastapi import HTTPException, status


class MessageService:
    """
    Business logic for chat messages.
    """

    @staticmethod
    def _notify_recipients(
        db: Session,
        db_message: Message,
        sender_id: uuid.UUID,
    ) -> None:
        """Create notifications for every member of a conversation.

        Extracted from ``send_message`` so that both immediate sends and the
        Celery task that flushes scheduled messages fire notifications.
        """
        sender = db.get(User, sender_id)
        sender_name = f"{sender.first_name} {sender.last_name}" if sender else "Someone"

        member_stmt = select(ConversationMember).where(
            ConversationMember.conversation_id == db_message.conversation_id
        )
        members = db.scalars(member_stmt).all()

        content_hint = (
            db_message.content[:50] if db_message.content else "sent an attachment"
        )
        notification_message = f"{sender_name}: {content_hint}"

        for member in members:
            if member.user_id != sender_id:
                NotificationService.create_message_notification(
                    db=db,
                    recipient_id=member.user_id,
                    actor_id=sender_id,
                    title="New Message",
                    message=notification_message,
                    action_url=f"/messages/{db_message.conversation_id}",
                    conversation_id=db_message.conversation_id,
                    message_id=db_message.id,
                )

    @staticmethod
    def send_message(
        db: Session,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        message: MessageCreate,
    ) -> Message:
        """Send an immediate message, or queue it for later when scheduled."""

        if message.scheduled_for is not None:
            return MessageService.schedule_message(
                db=db,
                conversation_id=conversation_id,
                sender_id=sender_id,
                message=message,
            )

        # Check block status with conversation members
        recipient_user_ids = db.scalars(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id != sender_id,
            )
        ).all()

        for recipient_id in recipient_user_ids:
            if BlockService.is_blocked(db, sender_id, recipient_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot send message to this user due to blocking.",
                )

        db_message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            parent_message_id=message.parent_message_id,
            type=message.type,
            content=message.content,
            attachment_url=message.attachment_url,
            attachment_name=message.attachment_name,
            attachment_size=message.attachment_size,
            mime_type=message.mime_type,
        )

        db.add(db_message)
        db.flush()

        MessageService._clear_draft(db, sender_id, conversation_id)
        db.refresh(db_message)

        MessageService._notify_recipients(db, db_message, sender_id)

        return db_message

    @staticmethod
    def _clear_draft(
        db: Session,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
    ) -> None:
        """Delete any existing draft for ``user_id`` in ``conversation_id``."""
        from app.models.message_draft import MessageDraft
        from sqlalchemy import delete

        db.execute(
            delete(MessageDraft).where(
                MessageDraft.user_id == user_id,
                MessageDraft.conversation_id == conversation_id,
            )
        )
        db.flush()

    @staticmethod
    def schedule_message(
        db: Session,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        message: MessageCreate,
    ) -> Message:
        """Queue a message to be delivered at ``message.scheduled_for``.

        The row is persisted immediately but flagged ``is_sent=False`` so it
        stays hidden from the thread until the Celery task fires. Scheduling is
        intentionally block-agnostic at creation time; blocks are enforced when
        the message is actually flushed.
        """
        if message.scheduled_for is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scheduled_for is required to schedule a message.",
            )

        if message.scheduled_for <= utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scheduled_for must be in the future.",
            )

        # A scheduled message is not part of the thread until it is sent.
        db_message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            parent_message_id=message.parent_message_id,
            type=message.type,
            content=message.content,
            attachment_url=message.attachment_url,
            attachment_name=message.attachment_name,
            attachment_size=message.attachment_size,
            mime_type=message.mime_type,
            is_sent=False,
            scheduled_for=message.scheduled_for,
        )

        db.add(db_message)
        db.flush()
        db.refresh(db_message)

        return db_message

    @staticmethod
    def flush_scheduled_message(
        db: Session,
        db_message: Message,
    ) -> Message:
        """Send a previously scheduled message (called by the Celery task).

        Marks the message as sent, back-dates ``created_at`` to the scheduled
        instant so it appears in the thread in the right position, and fires
        the usual notifications.
        """
        if db_message.is_sent:
            return db_message

        if db_message.scheduled_for is not None:
            db_message.created_at = db_message.scheduled_for

        db_message.is_sent = True
        db_message.scheduled_for = None

        db.flush()
        db.refresh(db_message)

        MessageService._clear_draft(
            db, db_message.sender_id, db_message.conversation_id
        )
        MessageService._notify_recipients(db, db_message, db_message.sender_id)

        return db_message

    @staticmethod
    def list_due_scheduled_messages(
        db: Session,
        before: datetime | None = None,
    ) -> list[Message]:
        """Return scheduled messages whose time has come (for the Celery task)."""
        now = before or utcnow()
        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                Message.is_sent.is_(False),
                Message.scheduled_for.is_not(None),
                Message.scheduled_for <= now,
            )
            .order_by(Message.scheduled_for.asc())
        )
        return list(db.scalars(stmt))

    @staticmethod
    def list_user_scheduled_messages(
        db: Session,
        sender_id: uuid.UUID,
    ) -> list[Message]:
        """Return the current user's not-yet-sent scheduled messages."""
        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                Message.sender_id == sender_id,
                Message.is_sent.is_(False),
                Message.scheduled_for.is_not(None),
            )
            .order_by(Message.scheduled_for.asc())
        )
        return list(db.scalars(stmt))

    @staticmethod
    def cancel_scheduled_message(
        db: Session,
        db_message: Message,
    ) -> Message:
        """Cancel a scheduled message by soft-deleting it."""
        db_message.is_deleted = True
        db_message.deleted_at = utcnow()
        db_message.content = "[Message cancelled]"
        db.flush()
        db.refresh(db_message)
        return db_message

    @staticmethod
    def get_message(
        db: Session,
        message_id: uuid.UUID,
    ) -> Message | None:

        return db.get(Message, message_id)

    @staticmethod
    def list_conversation_messages(
        db: Session,
        conversation_id: uuid.UUID,
        limit: int = 100,
    ) -> list[Message]:

        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                Message.conversation_id == conversation_id,
                Message.is_sent.is_(True),
            )
            .order_by(Message.created_at.asc())
            .limit(limit)
        )

        return list(db.scalars(stmt))

    @staticmethod
    def list_user_messages(
        db: Session,
        sender_id: uuid.UUID,
    ) -> list[Message]:

        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.sender_id == sender_id)
            .order_by(Message.created_at.desc())
        )

        return list(db.scalars(stmt))

    @staticmethod
    def update_message(
        db: Session,
        db_message: Message,
        message: MessageUpdate,
    ) -> Message:

        if db_message.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit a deleted message.",
            )

        data = message.model_dump(exclude_unset=True)

        for key, value in data.items():
            if key in ("is_edited", "is_deleted"):
                continue
            setattr(db_message, key, value)

        db_message.is_edited = True
        db_message.edited_at = utcnow()

        db.flush()
        db.refresh(db_message)

        return db_message

    @staticmethod
    def delete_message(
        db: Session,
        db_message: Message,
    ) -> Message:

        db_message.is_deleted = True
        db_message.deleted_at = utcnow()
        db_message.content = "[Message deleted]"

        db.flush()
        db.refresh(db_message)

        return db_message

    @staticmethod
    def restore_message(
        db: Session,
        db_message: Message,
    ) -> Message:

        db_message.is_deleted = False
        db_message.deleted_at = None

        db.flush()
        db.refresh(db_message)

        return db_message

    # ==========================================================
    # Pinning (issue #973)
    # ==========================================================

    @staticmethod
    def pin_message(
        db: Session,
        db_message: Message,
        user_id: uuid.UUID,
    ) -> Message:

        db_message.is_pinned = True
        db_message.pinned_by_id = user_id
        db_message.pinned_at = utcnow()

        db.flush()
        db.refresh(db_message)

        return db_message

    @staticmethod
    def unpin_message(
        db: Session,
        db_message: Message,
    ) -> Message:

        db_message.is_pinned = False
        db_message.pinned_by_id = None
        db_message.pinned_at = None

        db.flush()
        db.refresh(db_message)

        return db_message

    @staticmethod
    def list_pinned_messages(
        db: Session,
        conversation_id: uuid.UUID,
    ) -> list[Message]:

        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                Message.conversation_id == conversation_id,
                Message.is_pinned.is_(True),
                Message.is_sent.is_(True),
            )
            .order_by(Message.pinned_at.desc())
        )

        return list(db.scalars(stmt))

    @staticmethod
    def search_messages(
        db: Session,
        conversation_id: uuid.UUID,
        keyword: str,
    ) -> list[Message]:

        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                Message.conversation_id == conversation_id,
                Message.content.ilike(f"%{keyword}%"),
                Message.is_sent.is_(True),
                Message.is_deleted.is_(False),
            )
            .order_by(Message.created_at.desc())
        )

        return list(db.scalars(stmt))

    @staticmethod
    def search_all_messages(
        db: Session,
        user_id: uuid.UUID,
        keyword: str,
    ) -> list[Message]:
        """Global search across every conversation the user belongs to."""
        user_conv_ids = db.scalars(
            select(ConversationMember.conversation_id).where(
                ConversationMember.user_id == user_id
            )
        ).all()

        if not user_conv_ids:
            return []

        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                Message.conversation_id.in_(user_conv_ids),
                Message.content.ilike(f"%{keyword}%"),
                Message.is_sent.is_(True),
                Message.is_deleted.is_(False),
            )
            .order_by(Message.created_at.desc())
        )

        return list(db.scalars(stmt))

    @staticmethod
    def count_messages(
        db: Session,
        conversation_id: uuid.UUID,
    ) -> int:

        stmt = (
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == conversation_id)
        )

        return db.scalar(stmt) or 0

    # ==========================================================
    # Typing indicator
    # ----------------------------------------------------------
    # Issue #337: Display typing indicators in chat.
    #
    # Typing state is held in an ephemeral, process-local dict keyed by
    # (conversation_id, user_id) → monotonic timestamp. A short TTL (4s)
    # means a user is considered "typing" only while they keep sending
    # heartbeat POSTs from the client; if they stop, the indicator fades
    # automatically without needing an explicit "stopped typing" call.
    #
    # This is deliberately NOT persisted to the database:
    #   - typing state is intrinsically transient;
    #   - avoiding a new table means no migration, no schema change, and
    #     zero impact on existing tests / fixtures.
    # ==========================================================

    TYPING_TTL_SECONDS: float = 4.0
    _typing_store: Dict[Tuple[uuid.UUID, uuid.UUID], float] = {}

    @staticmethod
    def _now() -> float:
        # time.monotonic() is immune to wall-clock adjustments, which is
        # what we want for a TTL comparison.
        return time.monotonic()

    @classmethod
    def set_typing(
        cls,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Record that ``user_id`` is currently typing in ``conversation_id``.

        Idempotent — repeated heartbeats just refresh the timestamp.
        """
        cls._typing_store[(conversation_id, user_id)] = cls._now()

    @classmethod
    def clear_typing(
        cls,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Explicitly mark that ``user_id`` stopped typing.

        Optional — entries expire on their own via TTL. Called when the
        user sends a message or blurs the input so the indicator
        disappears immediately rather than waiting for the TTL.
        """
        cls._typing_store.pop((conversation_id, user_id), None)

    @classmethod
    def get_typing_users(
        cls,
        conversation_id: uuid.UUID,
        exclude_user_id: uuid.UUID | None = None,
    ) -> list[uuid.UUID]:
        """Return user IDs currently typing in ``conversation_id``.

        Stale entries (older than ``TYPING_TTL_SECONDS``) are pruned on
        read. The requesting user is excluded by default so a client
        never sees its own typing indicator echoed back.
        """
        now = cls._now()
        cutoff = now - cls.TYPING_TTL_SECONDS

        # Prune expired entries for this conversation (and any others that
        # happen to be checked in the same sweep). We iterate over a list
        # copy so we can mutate the dict safely.
        for key in list(cls._typing_store.keys()):
            if cls._typing_store[key] < cutoff:
                cls._typing_store.pop(key, None)

        typing = [
            uid
            for (cid, uid), ts in cls._typing_store.items()
            if cid == conversation_id and ts >= cutoff and uid != exclude_user_id
        ]
        return typing

    @staticmethod
    def mark_as_read(
        db: Session,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Message:
        """Mark a single message as read by user_id."""
        db_message = db.get(Message, message_id)
        if not db_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )

        # Ensure user is a member of the conversation
        is_member = db.scalar(
            select(func.count(ConversationMember.id)).where(
                ConversationMember.conversation_id == db_message.conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this conversation",
            )

        if db_message.read_at is None:
            db_message.read_at = utcnow()
            db.flush()
            db.refresh(db_message)

        return db_message

    @staticmethod
    def bulk_mark_as_read(
        db: Session,
        message_ids: list[uuid.UUID],
        user_id: uuid.UUID,
    ) -> tuple[int, datetime]:
        """Mark multiple messages as read by user_id."""
        if not message_ids:
            return 0, utcnow()

        # Find conversations the user belongs to
        user_conv_ids = db.scalars(
            select(ConversationMember.conversation_id).where(
                ConversationMember.user_id == user_id
            )
        ).all()

        if not user_conv_ids:
            return 0, utcnow()

        read_time = utcnow()
        from sqlalchemy import update

        result = db.execute(
            update(Message)
            .where(
                Message.id.in_(message_ids),
                Message.conversation_id.in_(user_conv_ids),
                Message.read_at.is_(None),
                Message.sender_id != user_id,
            )
            .values(read_at=read_time)
        )
        db.flush()
        return result.rowcount, read_time

    @staticmethod
    def mark_conversation_as_read(
        db: Session,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> tuple[int, datetime]:
        """Mark all unread messages in a conversation as read by user_id."""
        is_member = db.scalar(
            select(func.count(ConversationMember.id)).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this conversation",
            )

        read_time = utcnow()
        from sqlalchemy import update

        result = db.execute(
            update(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.read_at.is_(None),
                Message.sender_id != user_id,
            )
            .values(read_at=read_time)
        )
        db.flush()
        return result.rowcount, read_time

    @staticmethod
    def mark_as_delivered(
        db: Session,
        message_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Message:
        """Mark a single message as delivered to user_id."""
        db_message = db.get(Message, message_id)
        if not db_message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found",
            )

        # Ensure user is a member of the conversation
        is_member = db.scalar(
            select(func.count(ConversationMember.id)).where(
                ConversationMember.conversation_id == db_message.conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this conversation",
            )

        if db_message.delivered_at is None:
            db_message.delivered_at = utcnow()
            db.flush()
            db.refresh(db_message)

        return db_message

    @staticmethod
    def bulk_mark_as_delivered(
        db: Session,
        message_ids: list[uuid.UUID],
        user_id: uuid.UUID,
    ) -> tuple[int, datetime]:
        """Mark multiple messages as delivered to user_id."""
        if not message_ids:
            return 0, utcnow()

        # Find conversations the user belongs to
        user_conv_ids = db.scalars(
            select(ConversationMember.conversation_id).where(
                ConversationMember.user_id == user_id
            )
        ).all()

        if not user_conv_ids:
            return 0, utcnow()

        deliver_time = utcnow()
        from sqlalchemy import update

        result = db.execute(
            update(Message)
            .where(
                Message.id.in_(message_ids),
                Message.conversation_id.in_(user_conv_ids),
                Message.delivered_at.is_(None),
                Message.sender_id != user_id,
            )
            .values(delivered_at=deliver_time)
        )
        db.flush()
        return result.rowcount, deliver_time

    @staticmethod
    def mark_conversation_as_delivered(
        db: Session,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> tuple[int, datetime]:
        """Mark all undelivered messages in a conversation as delivered to user_id."""
        is_member = db.scalar(
            select(func.count(ConversationMember.id)).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this conversation",
            )

        deliver_time = utcnow()
        from sqlalchemy import update

        result = db.execute(
            update(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.delivered_at.is_(None),
                Message.sender_id != user_id,
            )
            .values(delivered_at=deliver_time)
        )
        db.flush()
        return result.rowcount, deliver_time
