"""Capability enforcement for document operations."""

from collections.abc import Iterable

from roborean_spec import DocumentDriverManifest, DocumentOperation

from .errors import UnsupportedOperationError


class CapabilitySet:
    """Immutable set of operation capability identifiers.

    Attributes:
        _items: Frozen set of advertised operation names.
    """

    _items: frozenset[str]

    def __init__(self, capabilities: Iterable[str]) -> None:
        """Store capabilities.

        Args:
            capabilities: Operation names this driver advertises.
        """
        self._items = frozenset(capabilities)

    def allows(self, op_name: str) -> bool:
        """Return whether ``op_name`` is advertised.

        Args:
            op_name: Document operation name to check.

        Returns:
            True when the capability set includes ``op_name``.
        """
        return op_name in self._items


def assert_op_allowed(
    manifest: DocumentDriverManifest,
    op: DocumentOperation,
) -> None:
    """Raise when an operation is outside the driver capability set.

    Args:
        manifest: Driver capability manifest.
        op: Document operation about to be applied.

    Raises:
        UnsupportedOperationError: When ``op.op`` is not advertised.
    """
    if op.op not in manifest.capabilities:
        raise UnsupportedOperationError(
            f"Driver {manifest.driver_id} does not support {op.op}"
        )
