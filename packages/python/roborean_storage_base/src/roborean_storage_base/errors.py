"""Shared storage failure types."""


class StorageError(Exception):
    """Base storage failure."""


class NotFoundError(StorageError):
    """Entity missing from the store."""


class ConflictError(StorageError):
    """Idempotency or optimistic-lock conflict."""


class IntegrityError(StorageError):
    """Corrupt or incomplete package."""
