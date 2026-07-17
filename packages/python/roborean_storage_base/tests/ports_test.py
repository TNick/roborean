"""Document expected storage port semantics with an in-memory fake."""

import pytest
from roborean_spec import (
    Project,
    RunRecord,
    RunRequest,
    RunStatus,
    RunTrigger,
    project_from_dict,
)
from roborean_storage_base import ConflictError, NotFoundError


class MemoryProjectRepository:
    """Minimal in-memory project repository for contract tests."""

    def __init__(self) -> None:
        """Create an empty store."""
        self._projects: dict[str, Project] = {}
        self._revisions: dict[tuple[str, str], Project] = {}

    def get(self, project_id: str) -> Project:
        """Return the current project or raise."""
        if project_id not in self._projects:
            raise NotFoundError(project_id)
        return self._projects[project_id]

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Return a pinned revision or raise."""
        key = (project_id, revision)
        if key not in self._revisions:
            raise NotFoundError(f"{project_id}@{revision}")
        return self._revisions[key]

    def save(self, project: Project, *, revision: str | None = None) -> str:
        """Store the project under a revision."""
        rev = revision or "1"
        self._projects[project.id] = project
        self._revisions[(project.id, rev)] = project
        return rev

    def list_ids(self) -> list[str]:
        """List project ids."""
        return sorted(self._projects)

    def delete(self, project_id: str) -> None:
        """Delete one project."""
        self._projects.pop(project_id, None)


class MemoryRunRepository:
    """Minimal in-memory run repository for contract tests."""

    def __init__(self) -> None:
        """Create an empty store."""
        self._by_id: dict[str, RunRecord] = {}
        self._by_key: dict[tuple[str, str], str] = {}

    def get(self, run_id: str) -> RunRecord:
        """Return one run or raise."""
        if run_id not in self._by_id:
            raise NotFoundError(run_id)
        return self._by_id[run_id]

    def get_by_idempotency(
        self, project_id: str, idempotency_key: str
    ) -> RunRecord | None:
        """Lookup by idempotency key."""
        run_id = self._by_key.get((project_id, idempotency_key))
        return None if run_id is None else self._by_id[run_id]

    def save(self, record: RunRecord) -> None:
        """Insert a run, rejecting duplicate keys."""
        key = (record.project_id, record.idempotency_key)
        if key in self._by_key:
            raise ConflictError("duplicate idempotency key")
        self._by_id[record.run_id] = record
        self._by_key[key] = record.run_id

    def update(self, record: RunRecord) -> None:
        """Replace an existing run."""
        if record.run_id not in self._by_id:
            raise NotFoundError(record.run_id)
        self._by_id[record.run_id] = record

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List runs for one project."""
        items = [
            item
            for item in self._by_id.values()
            if item.project_id == project_id
        ]
        return items[:limit]


class TestMemoryPorts:
    """Contract checks for the in-memory fakes."""

    def test_project_missing_raises(self) -> None:
        """Missing projects raise NotFoundError."""
        repo = MemoryProjectRepository()
        with pytest.raises(NotFoundError):
            repo.get("missing")

    def test_run_idempotency_conflict(self) -> None:
        """Duplicate idempotency keys conflict on save."""
        project = project_from_dict(
            {
                "schemaVersion": "1.0.0",
                "id": "p1",
                "name": "P",
                "pluginRequirements": [],
                "workspace": {"variables": []},
                "bits": [],
                "documents": [],
                "templates": [],
                "metadata": {},
            }
        )
        projects = MemoryProjectRepository()
        projects.save(project, revision="1")
        runs = MemoryRunRepository()
        request = RunRequest(
            projectId="p1",
            idempotencyKey="k1",
            trigger=RunTrigger.TEST,
        )
        record = RunRecord(
            runId="r1",
            idempotencyKey="k1",
            projectId="p1",
            projectRevision="1",
            compiledDigest="d",
            status=RunStatus.QUEUED,
            request=request,
            attempt=1,
            engineVersion="0.2.0",
            pluginVersions={},
            createdAt="2026-01-01T00:00:00+00:00",
            requestDigest="abc",
        )
        runs.save(record)
        with pytest.raises(ConflictError):
            runs.save(record.model_copy(update={"run_id": "r2"}))
