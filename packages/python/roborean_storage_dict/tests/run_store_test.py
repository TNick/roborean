"""Tests for durable run artifact storage."""

import pytest
from roborean_spec import (
    RunRecord,
    RunRequest,
    RunStatus,
    RunTrigger,
)
from roborean_storage_base import ConflictError
from roborean_storage_dict import DictRunRepository


def _record(run_id: str, key: str = "k1", digest: str = "abc") -> RunRecord:
    """Build a minimal queued run record."""
    return RunRecord(
        runId=run_id,
        idempotencyKey=key,
        projectId="example.minimal",
        projectRevision="1",
        compiledDigest="",
        status=RunStatus.QUEUED,
        request=RunRequest(
            projectId="example.minimal",
            idempotencyKey=key,
            trigger=RunTrigger.TEST,
        ),
        attempt=1,
        engineVersion="0.2.0",
        pluginVersions={},
        createdAt="2026-01-01T00:00:00+00:00",
        requestDigest=digest,
    )


class TestDictRunRepository:
    """Filesystem run repository behavior."""

    def test_save_and_get(self, store_root) -> None:
        """Runs persist under project/run directories."""
        repo = DictRunRepository(store_root)
        repo.save(_record("r1"))
        loaded = repo.get("r1")
        assert loaded.run_id == "r1"
        assert repo.get_by_idempotency("example.minimal", "k1").run_id == "r1"

    def test_idempotency_conflict_on_digest_mismatch(self, store_root) -> None:
        """Same key with a different body digest conflicts."""
        repo = DictRunRepository(store_root)
        repo.save(_record("r1", digest="aaa"))
        with pytest.raises(ConflictError):
            repo.save(_record("r2", digest="bbb"))
