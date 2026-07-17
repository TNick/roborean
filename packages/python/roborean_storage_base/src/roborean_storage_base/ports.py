"""Repository and artifact store protocols."""

from typing import Protocol

from roborean_spec import Project, RunRecord


class ProjectRepository(Protocol):
    """Load and save portable projects by identifier."""

    def get(self, project_id: str) -> Project:
        """Return the current revision of a project.

        Args:
            project_id: Stable project identifier.

        Returns:
            Current project document.

        Raises:
            NotFoundError: When the project is not stored.
        """

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Return a pinned project revision.

        Args:
            project_id: Stable project identifier.
            revision: Revision identifier to load.

        Returns:
            Project document at the requested revision.

        Raises:
            NotFoundError: When the revision is not stored.
        """

    def save(self, project: Project, *, revision: str | None = None) -> str:
        """Persist a project and return the revision identifier.

        Args:
            project: Project document to store.
            revision: Optional revision identifier; adapters may assign one.

        Returns:
            Revision identifier that was persisted.
        """

    def list_ids(self) -> list[str]:
        """List stored project identifiers.

        Returns:
            Sorted or adapter-defined list of project ids.
        """

    def delete(self, project_id: str) -> None:
        """Remove a project and its revisions.

        Args:
            project_id: Stable project identifier to delete.

        Raises:
            NotFoundError: When the project is not stored.
        """


class RunRepository(Protocol):
    """Persist durable run records with idempotency lookup."""

    def get(self, run_id: str) -> RunRecord:
        """Return one run by identifier.

        Args:
            run_id: Durable run identifier.

        Returns:
            Persisted run record.

        Raises:
            NotFoundError: When the run is not stored.
        """

    def get_by_idempotency(
        self, project_id: str, idempotency_key: str
    ) -> RunRecord | None:
        """Return an existing run for an idempotency key, if any.

        Args:
            project_id: Project that owns the run.
            idempotency_key: Client-supplied idempotency key.

        Returns:
            Matching run record, or None when no prior run exists.
        """

    def save(self, record: RunRecord) -> None:
        """Insert a new run record.

        Args:
            record: Run record to insert.

        Raises:
            ConflictError: When the run id or idempotency key conflicts.
        """

    def update(self, record: RunRecord) -> None:
        """Replace an existing run record.

        Args:
            record: Run record that replaces the stored version.

        Raises:
            NotFoundError: When the run is not stored.
        """

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List recent runs for a project, newest first.

        Args:
            project_id: Project whose runs should be listed.
            limit: Maximum number of runs to return.

        Returns:
            Recent run records for the project.
        """


class ArtifactStore(Protocol):
    """Store opaque binary artifacts referenced by runs."""

    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> str:
        """Store bytes and return the storage key.

        Args:
            key: Storage key for the artifact.
            data: Artifact bytes to persist.
            content_type: MIME type associated with the bytes.

        Returns:
            Storage key used for later retrieval.
        """

    def get_bytes(self, key: str) -> bytes:
        """Load previously stored bytes.

        Args:
            key: Storage key previously returned by ``put_bytes``.

        Returns:
            Stored artifact bytes.

        Raises:
            NotFoundError: When the key is not stored.
        """
