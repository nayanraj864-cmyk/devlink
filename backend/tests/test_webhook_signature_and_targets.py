"""
The bytes we sign are the bytes we send, and we only send them somewhere we
checked (#1319).

Two faults, independent, each enough on its own to make the feature not do what
it says.

`generate_signature` hashed `json.dumps(payload, sort_keys=True)` while
`_send_http_request` handed the dict to `httpx` and let it serialise again.
Different separators, different `ensure_ascii`, different key order -- so the
`X-DevLink-Signature` header described a payload that was never transmitted and
no receiver could verify it.

And `_send_http_request` posted wherever it was told. `app/utils/url_safety.py`
had done this job for link previews since #1196; webhook delivery never used it,
while `POST /api/webhooks/dispatch` takes a caller-supplied URL from any
authenticated user and `GET /api/webhooks/deliveries` hands the response body
back to them.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
import uuid

import httpx
import pytest
from sqlalchemy import select

from app.models.webhook import (
    WebhookDeadLetterQueue,
    WebhookDelivery,
    WebhookDeliveryStatus,
)
from app.services.webhook_service import WebhookService
from app.utils.url_safety import UnsafeURL, validate_outbound_url

SECRET = "shared-secret"

# A payload with every difference between the two serialisers in it: keys out
# of order, and a character that `ensure_ascii` would escape.
PAYLOAD = {"b": 1, "a": "café", "c": [1, 2], "nested": {"z": True, "y": None}}


@pytest.fixture
def offline_validation(monkeypatch):
    """The real rules, with a stub resolver, so nothing here needs DNS."""

    addresses = {
        "metadata.internal": ("169.254.169.254",),
        "localhost": ("127.0.0.1",),
        "example.com": ("93.184.216.34",),
    }

    def resolver(host: str) -> tuple[str, ...]:
        # An IP literal resolves to itself, which is what the real resolver
        # does and what makes the private-address rule apply to it.
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            return (host,)

        return addresses.get(host, ("93.184.216.34",))

    monkeypatch.setattr(
        WebhookService,
        "validate_target",
        staticmethod(lambda url: validate_outbound_url(url, resolver=resolver)),
    )
    return resolver


# ---------------------------------------------------------------------------
# Signature over the transmitted body
# ---------------------------------------------------------------------------


class TestSignature:
    def _verify_as_a_receiver_would(self, body: bytes, header: str) -> bool:
        """
        The only procedure a receiver has: HMAC what arrived, compare.

        No knowledge of how we serialise, because a receiver has none.
        """
        expected = hmac.new(SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", header)

    def test_the_signature_verifies_against_the_body_we_send(self):
        body = WebhookService.canonical_body(PAYLOAD)
        header = WebhookService.generate_signature(PAYLOAD, SECRET)

        assert self._verify_as_a_receiver_would(body, header) is True

    def test_the_body_httpx_puts_on_the_wire_is_the_body_we_signed(self):
        """
        The actual regression. Building the request is what the old code let
        `httpx` do from the dict, and the bytes came out different.
        """
        body = WebhookService.canonical_body(PAYLOAD)
        request = httpx.Request("POST", "https://example.com/hook", content=body)

        assert request.content == body
        assert self._verify_as_a_receiver_would(
            request.content, WebhookService.generate_signature(PAYLOAD, SECRET)
        )

    def test_letting_httpx_serialise_would_not_have_verified(self):
        """
        Pins the bug itself, so nobody reintroduces `json=payload` here and
        assumes it is equivalent.
        """
        httpx_body = httpx.Request(
            "POST", "https://example.com/hook", json=PAYLOAD
        ).content
        old_signed_bytes = json.dumps(PAYLOAD, sort_keys=True).encode("utf-8")

        assert httpx_body != old_signed_bytes

    def test_key_order_does_not_change_the_signature(self):
        """A retry rebuilds the payload from JSONB; ordering must not matter."""
        reordered = {k: PAYLOAD[k] for k in reversed(list(PAYLOAD))}

        assert WebhookService.generate_signature(
            reordered, SECRET
        ) == WebhookService.generate_signature(PAYLOAD, SECRET)

    def test_a_different_payload_gives_a_different_signature(self):
        other = dict(PAYLOAD, b=2)

        assert WebhookService.generate_signature(
            other, SECRET
        ) != WebhookService.generate_signature(PAYLOAD, SECRET)

    def test_a_different_secret_gives_a_different_signature(self):
        assert WebhookService.generate_signature(
            PAYLOAD, "other"
        ) != WebhookService.generate_signature(PAYLOAD, SECRET)

    def test_a_string_payload_is_signed_as_given(self):
        raw = "already serialised"

        assert WebhookService.canonical_body(raw) == raw.encode("utf-8")


# ---------------------------------------------------------------------------
# Where we are willing to connect
# ---------------------------------------------------------------------------


def _delivery(db, url: str) -> WebhookDelivery:
    row = WebhookDelivery(
        id=uuid.uuid4(),
        event_type="test.event",
        target_url=url,
        payload={"a": 1},
        status=WebhookDeliveryStatus.PENDING,
        attempts=0,
        max_retries=3,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


class TestDestinationValidation:
    @pytest.mark.parametrize(
        "url",
        [
            "http://metadata.internal/latest/meta-data/",  # resolves link-local
            "http://127.0.0.1/hook",
            "http://localhost/hook",
            "file:///etc/passwd",
            "ftp://example.com/hook",
            "https://user:pass@example.com/hook",
            "https://example.com:9200/hook",
        ],
    )
    def test_dispatch_refuses_a_destination_we_will_not_connect_to(
        self, db, offline_validation, url
    ):
        with pytest.raises(UnsafeURL):
            WebhookService.dispatch_webhook(
                db=db,
                event_type="test.event",
                target_url=url,
                payload={"a": 1},
            )

        # And nothing was recorded, because nothing was attempted.
        assert db.scalars(select(WebhookDelivery)).all() == []

    def test_the_api_answers_400_rather_than_storing_a_failure(
        self, client, register_and_login, offline_validation
    ):
        _, token = register_and_login("hooker@example.com", "hooker")

        response = client.post(
            "/api/webhooks/dispatch",
            json={
                "event_type": "test.event",
                "target_url": "http://metadata.internal/latest/meta-data/",
                "payload": {"a": 1},
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "non-public" in response.json()["detail"]

    def test_a_retry_revalidates(self, db, offline_validation, monkeypatch):
        """
        A row can already be in the table -- from before this check, or from a
        DNS answer that has since changed. `process_pending_retries` must not
        take the stored URL on trust.
        """
        delivery = _delivery(db, "http://metadata.internal/latest/meta-data/")

        def explode(*args, **kwargs):
            raise AssertionError("should not have reached the network")

        monkeypatch.setattr(WebhookService, "_send_http_request", explode)

        assert WebhookService._execute_delivery(db, delivery) is False

        db.refresh(delivery)
        assert delivery.status == WebhookDeliveryStatus.EXHAUSTED
        assert delivery.attempts == 0
        assert "Refused" in delivery.error_message

    def test_a_refused_delivery_returns_nothing_about_the_destination(
        self, db, offline_validation
    ):
        """
        `response_body` is what `GET /webhooks/deliveries` hands back, and it
        is what turned this from a blind SSRF into a read primitive. A refusal
        must leave it empty rather than explaining what it found.
        """
        delivery = _delivery(db, "http://metadata.internal/latest/meta-data/")

        WebhookService._execute_delivery(db, delivery)

        db.refresh(delivery)
        assert delivery.response_body is None
        assert delivery.response_status_code is None

    def test_a_refused_delivery_is_not_retried(self, db, offline_validation):
        """
        Exhausted, not failed. A backoff schedule would turn one rejected
        request into several probes spread over an hour.
        """
        delivery = _delivery(db, "http://metadata.internal/latest/meta-data/")

        WebhookService._execute_delivery(db, delivery)

        db.refresh(delivery)
        assert delivery.next_retry_at is None
        assert WebhookService.process_pending_retries(db=db)["processed"] == 0

    def test_a_refused_delivery_is_recorded_in_the_dlq(self, db, offline_validation):
        delivery = _delivery(db, "http://metadata.internal/latest/meta-data/")

        WebhookService._execute_delivery(db, delivery)

        entry = db.scalar(
            select(WebhookDeadLetterQueue).where(
                WebhookDeadLetterQueue.delivery_id == delivery.id
            )
        )
        assert entry is not None
        assert "Refused" in entry.failure_reason

    def test_an_allowed_destination_still_goes_through(
        self, db, offline_validation, monkeypatch
    ):
        sent = {}

        def capture(target, body, headers):
            sent["target"] = target
            sent["body"] = body
            sent["headers"] = headers
            return httpx.Response(200, text="ok")

        monkeypatch.setattr(WebhookService, "_send_http_request", staticmethod(capture))

        delivery = WebhookService.dispatch_webhook(
            db=db,
            event_type="test.event",
            target_url="https://example.com/hook",
            payload=PAYLOAD,
        )

        assert delivery.status == WebhookDeliveryStatus.DELIVERED
        assert sent["body"] == WebhookService.canonical_body(PAYLOAD)
        assert sent["target"].host == "example.com"
        assert sent["headers"]["Content-Type"] == "application/json"
