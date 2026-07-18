"""Concurrency semantics for dict idempotency index."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import pytest
from roborean_engine import RunService
from roborean_spec import RunRequest, RunTrigger
from roborean_storage_base import ConflictError
from roborean_storage_dict import (
    DictArtifactStore,
    DictProjectRepository,
    DictRunRepository,
    load_project_dir,
)


def _conformance_package(name: str) -> Path:
    """Return a conformance package directory path.

    Args:
        name: Package folder name under ``conformance/packages``.

    Returns:
        Absolute path to the package directory.
    """
    return (
        Path(__file__).resolve().parents[4] / "conformance" / "packages" / name
    )


@pytest.mark.integration
class TestDictIdempotencyConcurrency:
    """Duplicate idempotency keys return the same run."""

    def test_duplicate_key_same_run(self, tmp_path: Path) -> None:
        """Two sequential creates with the same key share one run id."""
        root = tmp_path / "store"
        service = RunService(
            projects=DictProjectRepository(root),
            runs=DictRunRepository(root),
            artifacts=DictArtifactStore(root),
        )
        project = load_project_dir(_conformance_package("02_set_and_copy"))
        service.projects.save(project, revision="1")
        request = RunRequest(
            projectId=project.id,
            projectRevision="1",
            idempotencyKey="dup-key",
            trigger=RunTrigger.TEST,
        )
        first = service.create_and_execute(request)
        second = service.create_and_execute(request)
        assert first.run_id == second.run_id

    def test_parallel_same_key_one_run(self, tmp_path: Path) -> None:
        """Parallel create_and_execute calls share one durable run id."""
        root = tmp_path / "store"
        runs = DictRunRepository(root)
        service = RunService(
            projects=DictProjectRepository(root),
            runs=runs,
            artifacts=DictArtifactStore(root),
        )
        project = load_project_dir(_conformance_package("02_set_and_copy"))
        service.projects.save(project, revision="1")
        request = RunRequest(
            projectId=project.id,
            projectRevision="1",
            idempotencyKey="parallel-key",
            trigger=RunTrigger.TEST,
        )

        worker_count = 12

        def _execute() -> str:
            record = service.create_and_execute(request)
            return record.run_id

        with ThreadPoolExecutor(max_workers=worker_count) as pool:
            futures = [pool.submit(_execute) for _ in range(worker_count)]
            run_ids = [future.result() for future in as_completed(futures)]

        assert len(set(run_ids)) == 1
        project_runs = root / "runs" / project.id
        run_dirs = [
            path
            for path in project_runs.iterdir()
            if (path / "run-record.json").is_file()
        ]
        assert len(run_dirs) == 1

    def test_parallel_save_claims_one_index(self, tmp_path: Path) -> None:
        """Only one idempotency index file is created under parallel saves."""
        from roborean_spec import RunRecord, RunStatus

        root = tmp_path / "store"
        repo = DictRunRepository(root)
        barrier_count = 16

        def _minimal_record(run_id: str) -> RunRecord:
            return RunRecord(
                runId=run_id,
                idempotencyKey="race-key",
                projectId="example.minimal",
                projectRevision="1",
                compiledDigest="",
                status=RunStatus.QUEUED,
                request=RunRequest(
                    projectId="example.minimal",
                    idempotencyKey="race-key",
                    trigger=RunTrigger.TEST,
                ),
                attempt=1,
                engineVersion="0.2.0",
                pluginVersions={},
                createdAt="2026-01-01T00:00:00+00:00",
                requestDigest="same",
            )

        def _save(run_id: str) -> None:
            try:
                repo.save(_minimal_record(run_id))
            except ConflictError:
                pass

        with ThreadPoolExecutor(max_workers=barrier_count) as pool:
            futures = [
                pool.submit(_save, f"run-{index}")
                for index in range(barrier_count)
            ]
            for future in as_completed(futures):
                future.result()

        index_dir = root / "idempotency" / "example.minimal"
        index_files = list(index_dir.glob("*.json"))
        assert len(index_files) == 1
        winner = repo.get_by_idempotency("example.minimal", "race-key")
        assert winner is not None
