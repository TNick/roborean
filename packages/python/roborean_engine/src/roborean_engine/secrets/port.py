"""Secret resolver protocol."""

from typing import Protocol


class SecretResolver(Protocol):
    """Resolve opaque secret references in approved hosts only."""

    def resolve(self, ref: str) -> str:
        """Return the secret value for ``ref`` (never log it)."""
