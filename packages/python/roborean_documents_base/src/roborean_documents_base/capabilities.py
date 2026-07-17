"""Capability enforcement for document operations."""

from collections.abc import Iterable

from roborean_spec import DocumentDriverManifest, DocumentOperation

from .errors import UnsupportedOperationError


class CapabilitySet:
    """Immutable set of operation capability identifiers."""

    def __init__(self, capabilities: Iterable[str]) -> None:
        """Store capabilities."""
        self._items = frozenset(capabilities)

    def allows(self, op_name: str) -> bool:
        """Return whether ``op_name`` is advertised."""
        return op_name in self._items


def assert_op_allowed(
    manifest: DocumentDriverManifest,
    op: DocumentOperation,
) -> None:
    """Raise when an operation is outside the driver capability set."""
    if op.op not in manifest.capabilities:
        raise UnsupportedOperationError(
            f"Driver {manifest.driver_id} does not support {op.op}"
        )
