"""Artifact hashing helpers."""

import hashlib
from pathlib import Path


def hash_bytes(data: bytes) -> str:
    """Return a lowercase SHA-256 hex digest."""
    return hashlib.sha256(data).hexdigest()


def write_artifact(path: Path, data: bytes) -> None:
    """Write artifact bytes, creating parent directories."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
