"""Idempotency key normalization and request digests."""

import hashlib
import json
import re

from roborean_spec import RunRequest

_KEY_RE = re.compile(r"^[A-Za-z0-9._:-]+$")


def normalize_idempotency_key(key: str) -> str:
    """Validate and return a normalized idempotency key."""
    value = key.strip()
    if not value or len(value) > 128 or not _KEY_RE.match(value):
        raise ValueError(f"Invalid idempotency key: {key!r}")
    return value


def request_body_digest(request: RunRequest) -> str:
    """Hash the stable portion of a run request."""
    # Exclude requestedAt so clock skew cannot break idempotency.
    payload = request.model_dump(
        mode="json",
        by_alias=True,
        exclude_none=True,
        exclude={"requested_at"},
    )
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
