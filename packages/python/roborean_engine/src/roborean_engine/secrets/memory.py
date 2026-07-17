"""In-memory secret resolver for tests and local stubs."""

from collections.abc import Mapping


class MemorySecretResolver:
    """Resolve secrets from an in-memory mapping of ref -> value.

    Attributes:
        _values: Secret values keyed by full opaque ref string.
    """

    _values: dict[str, str]

    def __init__(self, values: Mapping[str, str]) -> None:
        """Store secret values keyed by full ref string.

        Args:
            values: Mapping of opaque secret refs to plaintext values.
        """
        self._values = dict(values)

    def resolve(self, ref: str) -> str:
        """Return a mapped secret or raise KeyError.

        Args:
            ref: Opaque secret reference to resolve.

        Returns:
            Plaintext secret for ``ref``.

        Raises:
            KeyError: When ``ref`` is not present in the mapping.
        """
        return self._values[ref]
