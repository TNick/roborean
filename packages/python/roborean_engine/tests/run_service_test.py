"""Durable RunService behavior."""

from pathlib import Path

import pytest
from roborean_spec import (
    RunRequest,
    RunStatus,
    RunTrigger,
    project_from_dict,
)
from roborean_storage_base import ConflictError
from roborean_storage_dict import (
    DictArtifactStore,
    DictProjectRepository,
    DictRunRepository,
)

from roborean_engine import RunService, load_project_path
from roborean_engine.compiler import compile_project
from roborean_engine.retry import decide_retry


@pytest.fixture
def set_and_copy_project() -> Path:
    """Path to the Phase 1 set-and-copy fixture."""
    return (
        Path(__file__).resolve().parents[4]
        / "conformance"
        / "projects"
        / "02_set_and_copy.json"
    )


@pytest.fixture
def service(tmp_path: Path):
    """Build a RunService over a temporary dict store."""
    root = tmp_path / "store"
    root.mkdir()
    return RunService(
        projects=DictProjectRepository(root),
        runs=DictRunRepository(root),
        artifacts=DictArtifactStore(root),
    )


@pytest.mark.integration
class TestRunServiceCreateAndExecute:
    """Idempotent create-and-execute flows."""

    def test_persists_succeeded_record(
        self, service: RunService, set_and_copy_project: Path
    ) -> None:
        """A successful run is stored with results and diff."""
        project = load_project_path(set_and_copy_project)
        service.projects.save(project, revision="1")
        record = service.create_and_execute(
            RunRequest(
                projectId=project.id,
                projectRevision="1",
                idempotencyKey="demo-key-1",
                trigger=RunTrigger.TEST,
            )
        )
        assert record.status is RunStatus.SUCCEEDED
        assert record.results is not None
        assert record.diff is not None
        assert any(
            change.key == "title" for change in record.diff.workspace_changes
        )

    def test_idempotent_second_call_returns_same_run(
        self, service: RunService, set_and_copy_project: Path
    ) -> None:
        """Duplicate keys do not re-execute."""
        project = load_project_path(set_and_copy_project)
        service.projects.save(project, revision="1")
        request = RunRequest(
            projectId=project.id,
            projectRevision="1",
            idempotencyKey="demo-key-1",
            trigger=RunTrigger.TEST,
        )
        first = service.create_and_execute(request)
        second = service.create_and_execute(request)
        assert first.run_id == second.run_id
        assert first.finished_at == second.finished_at

    def test_conflicting_payload_raises(
        self, service: RunService, set_and_copy_project: Path
    ) -> None:
        """Same key with different overrides conflicts."""
        project = load_project_path(set_and_copy_project)
        service.projects.save(project, revision="1")
        service.create_and_execute(
            RunRequest(
                projectId=project.id,
                projectRevision="1",
                idempotencyKey="demo-key-1",
                trigger=RunTrigger.TEST,
            )
        )
        with pytest.raises(ConflictError):
            service.create_and_execute(
                RunRequest(
                    projectId=project.id,
                    projectRevision="1",
                    idempotencyKey="demo-key-1",
                    trigger=RunTrigger.TEST,
                    workspaceOverrides={
                        "title": {
                            "kind": "public_literal",
                            "dataType": "string",
                            "value": "Other",
                        }
                    },
                )
            )


@pytest.mark.integration
class TestRunServiceRetry:
    """Retry policy enforcement."""

    def test_workspace_retry_creates_new_run(
        self, service: RunService, set_and_copy_project: Path
    ) -> None:
        """Workspace-effect projects may retry with a new run id."""
        project = load_project_path(set_and_copy_project)
        service.projects.save(project, revision="1")
        first = service.create_and_execute(
            RunRequest(
                projectId=project.id,
                projectRevision="1",
                idempotencyKey="retry-base",
                trigger=RunTrigger.TEST,
            )
        )
        second = service.retry(first.run_id)
        assert second.run_id != first.run_id
        assert second.request.retry_of_run_id == first.run_id
        assert second.status is RunStatus.SUCCEEDED

    def test_network_retry_forbidden(self, service: RunService) -> None:
        """Network-effect projects reject retry without force."""
        project = project_from_dict(
            {
                "schemaVersion": "1.0.0",
                "id": "example.network",
                "name": "Network",
                "pluginRequirements": [],
                "workspace": {"variables": []},
                "bits": [
                    {
                        "id": "n1",
                        "type": "roborean.fake_network",
                        "when": True,
                        "config": {},
                        "reads": [],
                        "writes": [],
                        "emits": [],
                        "effectClass": "network",
                        "onError": "abort",
                        "capabilities": [],
                    }
                ],
                "documents": [],
                "templates": [],
                "metadata": {},
            }
        )
        service.projects.save(project, revision="1")
        first = service.create_and_execute(
            RunRequest(
                projectId=project.id,
                projectRevision="1",
                idempotencyKey="net-1",
                trigger=RunTrigger.TEST,
            )
        )
        compiled = compile_project(project)
        decision = decide_retry(project, compiled, force=False)
        assert not decision.allowed
        with pytest.raises(ConflictError):
            service.retry(first.run_id, force=False)
