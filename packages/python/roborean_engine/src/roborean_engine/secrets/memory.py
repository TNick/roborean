"""In-memory secret resolver for tests and local stubs."""

from collections.abc import Mapping


class MemorySecretResolver:
    """Resolve secrets from an in-memory mapping of ref -> value."""

    def __init__(self, values: Mapping[str, str]) -> None:
        """Store secret values keyed by full ref string."""
        self._values = dict(values)

    def resolve(self, ref: str) -> str:
        """Return a mapped secret or raise KeyError."""
        return self._values[ref]
