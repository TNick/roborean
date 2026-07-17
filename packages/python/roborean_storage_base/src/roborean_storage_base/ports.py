"""Repository and artifact store protocols."""

from typing import Protocol

from roborean_spec import Project, RunRecord


class ProjectRepository(Protocol):
    """Load and save portable projects by identifier."""

    def get(self, project_id: str) -> Project:
        """Return the current revision of a project."""

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Return a pinned project revision."""

    def save(self, project: Project, *, revision: str | None = None) -> str:
        """Persist a project and return the revision identifier."""

    def list_ids(self) -> list[str]:
        """List stored project identifiers."""

    def delete(self, project_id: str) -> None:
        """Remove a project and its revisions."""


class RunRepository(Protocol):
    """Persist durable run records with idempotency lookup."""

    def get(self, run_id: str) -> RunRecord:
        """Return one run by identifier."""

    def get_by_idempotency(
        self, project_id: str, idempotency_key: str
    ) -> RunRecord | None:
        """Return an existing run for an idempotency key, if any."""

    def save(self, record: RunRecord) -> None:
        """Insert a new run record."""

    def update(self, record: RunRecord) -> None:
        """Replace an existing run record."""

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List recent runs for a project, newest first."""


class ArtifactStore(Protocol):
    """Store opaque binary artifacts referenced by runs."""

    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> str:
        """Store bytes and return the storage key."""

    def get_bytes(self, key: str) -> bytes:
        """Load previously stored bytes."""
