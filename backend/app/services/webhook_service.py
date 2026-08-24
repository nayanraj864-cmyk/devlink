from __future__ import annotations

import uuid
import hmac
import hashlib
import json
import httpx
import structlog
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.models.webhook import (
    WebhookDelivery,
    WebhookDeadLetterQueue,
    WebhookDeliveryStatus,
)
from app.utils.url_safety import (
    SafeTarget,
    UnsafeURL,
    pin_target,
    validate_outbound_url,
)

logger = structlog.get_logger("devlink.webhooks")


def calculate_backoff_delay(
    attempt: int,
    initial_delay: int = 2,
    multiplier: int = 2,
    max_delay: int = 3600,
) -> int:
    """
    Calculates exponential backoff delay in seconds.
    attempt 1: initial_delay (2s)
    attempt 2: initial_delay * multiplier^1 (4s)
    attempt 3: initial_delay * multiplier^2 (8s)
    """
    if attempt <= 1:
        return initial_delay
    delay = initial_delay * (multiplier ** (attempt - 1))
    return min(delay, max_delay)


class WebhookService:
    #: How a destination is checked before we connect to it.
    #:
    #: A class attribute rather than a direct call so it can be substituted:
    #: validation resolves the hostname, and a unit test that depends on DNS is
    #: a unit test that fails on a train.
    validate_target = staticmethod(validate_outbound_url)

    @classmethod
    def canonical_body(cls, payload: Dict[str, Any] | str) -> bytes:
        """
        The bytes we sign, which are the bytes we send.

        There is only one function here on purpose. The signature used to be
        computed over ``json.dumps(payload, sort_keys=True)`` while the request
        body came from ``httpx``'s own serialisation of the same dict -- which
        uses ``separators=(",", ":")``, ``ensure_ascii=False`` and insertion
        order. Three differences, any one of which is enough to make the
        signature un-verifiable by the only sane procedure a receiver has: HMAC
        the bytes you received and compare.

        ``sort_keys`` is kept so the same payload signs identically on a retry
        regardless of dict ordering, and the separators match what a receiver
        gets so nothing has to reverse-engineer our serialiser.
        """
        if isinstance(payload, (dict, list)):
            return json.dumps(
                payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False
            ).encode("utf-8")
        return str(payload).encode("utf-8")

    @classmethod
    def generate_signature(cls, payload: Dict[str, Any] | str, secret: str) -> str:
        """
        Generates an HMAC-SHA256 signature over the exact request body.
        """
        signature = hmac.new(
            secret.encode("utf-8"), cls.canonical_body(payload), hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"

    @classmethod
    def dispatch_webhook(
        cls,
        db: Session,
        event_type: str,
        target_url: str,
        payload: Dict[str, Any],
        headers: Optional[Dict[str, Any]] = None,
        secret: Optional[str] = None,
        max_retries: int = 5,
    ) -> WebhookDelivery:
        # Checked here as well as in `_execute_delivery` so the caller gets a
        # readable rejection instead of a stored delivery that quietly failed.
        # The one in `_execute_delivery` is the guard; this one is the message.
        cls.validate_target(target_url)

        # Include signature header if a shared secret is provided
        req_headers = headers or {}
        if secret:
            sig = cls.generate_signature(payload, secret)
            req_headers["X-DevLink-Signature"] = sig

        delivery = WebhookDelivery(
            id=uuid.uuid4(),
            event_type=event_type,
            target_url=target_url,
            payload=payload,
            headers=req_headers,
            status=WebhookDeliveryStatus.PENDING,
            attempts=0,
            max_retries=max_retries,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(delivery)
        db.commit()
        db.refresh(delivery)

        # Attempt initial delivery immediately
        cls._execute_delivery(db, delivery)
        return delivery

    @classmethod
    def _send_http_request(
        cls, target: SafeTarget, body: bytes, headers: dict
    ) -> httpx.Response:
        """
        POST the already-serialised body to a validated target.

        Takes ``bytes`` rather than a dict because the caller has already
        decided what the bytes are -- see :meth:`canonical_body`. Letting
        ``httpx`` serialise here is what made the signature describe a
        different payload than the one on the wire.

        The connection is pinned to the address validation approved, the same
        way link previews do it: handing the hostname to ``httpx`` would let it
        resolve a second time, and a short-TTL record that answers
        public-then-private turns the check into decoration.

        Redirects are not followed. A 302 to 169.254.169.254 is the whole
        attack, and re-validating each hop is not worth it for a webhook -- a
        receiver that wants us somewhere else can say so in its configuration.
        """
        pinned = pin_target(target)

        with httpx.Client(timeout=10.0, follow_redirects=False) as client:
            return client.post(
                pinned.url,
                content=body,
                headers={**headers, **pinned.headers},
                extensions=pinned.extensions,
            )

    @classmethod
    def _refuse_delivery(
        cls, db: Session, delivery: WebhookDelivery, reason: str
    ) -> bool:
        """
        Record a delivery we will not attempt, and stop.

        Exhausted rather than failed, because retrying changes nothing: the
        destination is not one we are willing to connect to, and the backoff
        schedule would otherwise turn one rejected request into several probes
        spread over an hour.

        Nothing is written to `response_status_code` or `response_body`. Those
        are the fields `GET /webhooks/deliveries` hands back, and the point of
        refusing is that we learned nothing about the destination worth
        returning.
        """
        delivery.status = WebhookDeliveryStatus.EXHAUSTED
        delivery.next_retry_at = None
        delivery.last_attempt_at = datetime.now(timezone.utc)
        delivery.error_message = f"Refused: {reason}"
        delivery.response_status_code = None
        delivery.response_body = None
        db.commit()

        logger.warning(
            "webhook_target_refused",
            delivery_id=str(delivery.id),
            target_url=delivery.target_url,
            reason=reason,
        )

        cls._move_to_dlq(db, delivery)
        return False

    @classmethod
    def _execute_delivery(cls, db: Session, delivery: WebhookDelivery) -> bool:
        # Before the attempt counter moves: nothing was attempted.
        try:
            target = cls.validate_target(delivery.target_url)
        except UnsafeURL as exc:
            return cls._refuse_delivery(db, delivery, str(exc))

        now = datetime.now(timezone.utc)
        delivery.attempts += 1
        delivery.last_attempt_at = now

        req_headers = {
            "Content-Type": "application/json",
            "User-Agent": "DevLink-Webhook/1.0",
        }
        if delivery.headers:
            req_headers.update(delivery.headers)

        success = False
        status_code: Optional[int] = None
        resp_text: Optional[str] = None
        error_msg: Optional[str] = None

        try:
            response = cls._send_http_request(
                target, cls.canonical_body(delivery.payload), req_headers
            )
            status_code = response.status_code
            resp_text = response.text[:2000] if response.text else ""

            if 200 <= status_code < 300:
                success = True
            else:
                error_msg = f"HTTP {status_code}: {resp_text[:200]}"
        except Exception as exc:
            error_msg = f"Network/HTTP Exception: {str(exc)}"
            logger.warning(
                "webhook_delivery_failed", delivery_id=str(delivery.id), error=error_msg
            )

        delivery.response_status_code = status_code
        delivery.response_body = resp_text
        delivery.error_message = error_msg

        if success:
            delivery.status = WebhookDeliveryStatus.DELIVERED
            delivery.next_retry_at = None
            db.commit()
            return True

        # Failed delivery attempt -> schedule retry or move to DLQ
        if delivery.attempts < delivery.max_retries:
            delivery.status = WebhookDeliveryStatus.FAILED
            delay_seconds = calculate_backoff_delay(delivery.attempts)
            delivery.next_retry_at = now + timedelta(seconds=delay_seconds)
            db.commit()
        else:
            delivery.status = WebhookDeliveryStatus.EXHAUSTED
            delivery.next_retry_at = None
            db.commit()
            cls._move_to_dlq(db, delivery)

        return False

    @classmethod
    def _move_to_dlq(
        cls, db: Session, delivery: WebhookDelivery
    ) -> WebhookDeadLetterQueue:
        existing = db.scalar(
            select(WebhookDeadLetterQueue).where(
                WebhookDeadLetterQueue.delivery_id == delivery.id
            )
        )
        if existing:
            existing.total_attempts = delivery.attempts
            existing.failure_reason = delivery.error_message or "Max retries exhausted"
            existing.failed_at = datetime.now(timezone.utc)
            db.commit()
            return existing

        dlq_item = WebhookDeadLetterQueue(
            id=uuid.uuid4(),
            delivery_id=delivery.id,
            event_type=delivery.event_type,
            target_url=delivery.target_url,
            payload=delivery.payload,
            headers=delivery.headers,
            total_attempts=delivery.attempts,
            failure_reason=delivery.error_message or "Max retries exhausted",
            failed_at=datetime.now(timezone.utc),
            is_replayed=False,
        )
        db.add(dlq_item)
        db.commit()
        db.refresh(dlq_item)
        return dlq_item

    @classmethod
    def process_pending_retries(cls, db: Session) -> Dict[str, int]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(WebhookDelivery)
            .where(
                or_(
                    WebhookDelivery.status == WebhookDeliveryStatus.PENDING,
                    WebhookDelivery.status == WebhookDeliveryStatus.FAILED,
                ),
                WebhookDelivery.next_retry_at <= now,
            )
            .order_by(WebhookDelivery.next_retry_at.asc())
            .limit(50)
        )

        pending_items = list(db.scalars(stmt))
        processed = 0
        succeeded = 0

        for item in pending_items:
            processed += 1
            if cls._execute_delivery(db, item):
                succeeded += 1

        return {
            "processed": processed,
            "succeeded": succeeded,
            "failed": processed - succeeded,
        }

    @classmethod
    def get_deliveries(
        cls,
        db: Session,
        page: int = 1,
        limit: int = 20,
        status: Optional[WebhookDeliveryStatus] = None,
        event_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        stmt = select(WebhookDelivery)

        if status:
            stmt = stmt.where(WebhookDelivery.status == status)
        if event_type:
            stmt = stmt.where(WebhookDelivery.event_type == event_type)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.scalar(count_stmt) or 0

        offset = (page - 1) * limit
        paginated_stmt = (
            stmt.order_by(WebhookDelivery.created_at.desc()).offset(offset).limit(limit)
        )

        items = list(db.scalars(paginated_stmt))
        pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    @classmethod
    def get_dlq_entries(
        cls,
        db: Session,
        page: int = 1,
        limit: int = 20,
        is_replayed: Optional[bool] = None,
    ) -> Dict[str, Any]:
        stmt = select(WebhookDeadLetterQueue)

        if is_replayed is not None:
            stmt = stmt.where(WebhookDeadLetterQueue.is_replayed == is_replayed)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.scalar(count_stmt) or 0

        offset = (page - 1) * limit
        paginated_stmt = (
            stmt.order_by(WebhookDeadLetterQueue.failed_at.desc())
            .offset(offset)
            .limit(limit)
        )

        items = list(db.scalars(paginated_stmt))
        pages = (total + limit - 1) // limit if limit > 0 else 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
        }

    @classmethod
    def get_dlq_entry(
        cls, db: Session, dlq_id: uuid.UUID
    ) -> Optional[WebhookDeadLetterQueue]:
        return db.scalar(
            select(WebhookDeadLetterQueue).where(WebhookDeadLetterQueue.id == dlq_id)
        )

    @classmethod
    def replay_dlq_entry(cls, db: Session, dlq_id: uuid.UUID) -> WebhookDelivery:
        dlq_item = cls.get_dlq_entry(db, dlq_id)
        if not dlq_item:
            raise ValueError(f"DLQ entry {dlq_id} not found")

        delivery = db.scalar(
            select(WebhookDelivery).where(WebhookDelivery.id == dlq_item.delivery_id)
        )
        if not delivery:
            delivery = WebhookDelivery(
                id=dlq_item.delivery_id,
                event_type=dlq_item.event_type,
                target_url=dlq_item.target_url,
                payload=dlq_item.payload,
                headers=dlq_item.headers,
                status=WebhookDeliveryStatus.PENDING,
                attempts=0,
                max_retries=5,
            )
            db.add(delivery)
            db.commit()

        is_success = cls._execute_delivery(db, delivery)

        now = datetime.now(timezone.utc)
        dlq_item.is_replayed = True
        dlq_item.replayed_at = now
        if is_success:
            delivery.status = WebhookDeliveryStatus.REPLAYED
        db.commit()

        return delivery

    @classmethod
    def replay_all_dlq_entries(cls, db: Session) -> Dict[str, int]:
        stmt = select(WebhookDeadLetterQueue).where(
            WebhookDeadLetterQueue.is_replayed.is_(False)
        )
        unreplayed_items = list(db.scalars(stmt))

        replayed_count = 0
        succeeded_count = 0

        for dlq in unreplayed_items:
            replayed_count += 1
            try:
                deliv = cls.replay_dlq_entry(db, dlq.id)
                if deliv.status in {
                    WebhookDeliveryStatus.DELIVERED,
                    WebhookDeliveryStatus.REPLAYED,
                }:
                    succeeded_count += 1
            except Exception:
                pass

        return {
            "total_replayed": replayed_count,
            "successful": succeeded_count,
            "failed": replayed_count - succeeded_count,
        }

    @classmethod
    def delete_dlq_entry(cls, db: Session, dlq_id: uuid.UUID) -> bool:
        dlq_item = cls.get_dlq_entry(db, dlq_id)
        if not dlq_item:
            return False
        db.delete(dlq_item)
        db.commit()
        return True

    @classmethod
    def get_metrics(cls, db: Session) -> Dict[str, Any]:
        total_deliveries = db.scalar(select(func.count(WebhookDelivery.id))) or 0
        successful = (
            db.scalar(
                select(func.count(WebhookDelivery.id)).where(
                    or_(
                        WebhookDelivery.status == WebhookDeliveryStatus.DELIVERED,
                        WebhookDelivery.status == WebhookDeliveryStatus.REPLAYED,
                    )
                )
            )
            or 0
        )
        failed = (
            db.scalar(
                select(func.count(WebhookDelivery.id)).where(
                    or_(
                        WebhookDelivery.status == WebhookDeliveryStatus.FAILED,
                        WebhookDelivery.status == WebhookDeliveryStatus.EXHAUSTED,
                    )
                )
            )
            or 0
        )
        pending = (
            db.scalar(
                select(func.count(WebhookDelivery.id)).where(
                    WebhookDelivery.status == WebhookDeliveryStatus.PENDING
                )
            )
            or 0
        )

        dlq_count = db.scalar(select(func.count(WebhookDeadLetterQueue.id))) or 0
        replayed_count = (
            db.scalar(
                select(func.count(WebhookDeadLetterQueue.id)).where(
                    WebhookDeadLetterQueue.is_replayed.is_(True)
                )
            )
            or 0
        )

        success_rate = (
            (successful / total_deliveries * 100.0) if total_deliveries > 0 else 100.0
        )

        return {
            "total_deliveries": total_deliveries,
            "successful_deliveries": successful,
            "failed_deliveries": failed,
            "pending_deliveries": pending,
            "dlq_count": dlq_count,
            "replayed_count": replayed_count,
            "delivery_success_rate": round(success_rate, 2),
        }
