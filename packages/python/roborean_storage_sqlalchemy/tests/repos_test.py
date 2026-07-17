"""Integration tests for SQLAlchemy repositories."""

import pytest
from roborean_spec import (
    RunRecord,
    RunRequest,
    RunStatus,
    RunTrigger,
)
from roborean_storage_base import ConflictError
from roborean_storage_sqlalchemy import (
    SqlAlchemyProjectRepository,
    SqlAlchemyRunRepository,
)


@pytest.mark.integration
class TestSqlAlchemyRepos:
    """Project and run persistence through SQLAlchemy."""

    def test_project_roundtrip(self, session_factory, minimal_project) -> None:
        """Projects save and load."""
        repo = SqlAlchemyProjectRepository(session_factory)
        repo.save(minimal_project, revision="1")
        assert repo.get(minimal_project.id).name == "Minimal"
        loaded = repo.get_revision(minimal_project.id, "1")
        assert loaded.id == minimal_project.id

    def test_run_idempotency(self, session_factory) -> None:
        """Duplicate idempotency keys conflict."""
        repo = SqlAlchemyRunRepository(session_factory)
        record = RunRecord(
            runId="r1",
            idempotencyKey="k1",
            projectId="example.minimal",
            projectRevision="1",
            compiledDigest="d",
            status=RunStatus.QUEUED,
            request=RunRequest(
                projectId="example.minimal",
                idempotencyKey="k1",
                trigger=RunTrigger.TEST,
            ),
            attempt=1,
            engineVersion="0.2.0",
            pluginVersions={},
            createdAt="2026-01-01T00:00:00+00:00",
            requestDigest="abc",
        )
        repo.save(record)
        with pytest.raises(ConflictError):
            repo.save(record.model_copy(update={"run_id": "r2"}))
        assert repo.get_by_idempotency("example.minimal", "k1").run_id == "r1"
