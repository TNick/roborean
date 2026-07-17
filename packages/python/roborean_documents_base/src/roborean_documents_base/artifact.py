"""Artifact hashing helpers."""

import hashlib
from pathlib import Path


def hash_bytes(data: bytes) -> str:
    """Return a lowercase SHA-256 hex digest.

    Args:
        data: Artifact bytes to hash.

    Returns:
        Hex-encoded SHA-256 digest.
    """
    return hashlib.sha256(data).hexdigest()


def write_artifact(path: Path, data: bytes) -> None:
    """Write artifact bytes, creating parent directories.

    Args:
        path: Destination filesystem path for the artifact.
        data: Artifact bytes to write.
    """
    # Ensure the parent directory exists before writing.
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
