"""Dictionary/filesystem repositories for projects and runs."""

import json
import logging
from pathlib import Path

from roborean_spec import Project, RunRecord, project_from_dict
from roborean_storage_base import ConflictError, NotFoundError

from .project_package import load_project_dir, save_project_dir, write_revision

logger = logging.getLogger(__name__)


def _read_json(path: Path) -> dict:
    """Load a JSON object from disk."""
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: dict) -> None:
    """Write a JSON object with a trailing newline."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


class DictProjectRepository:
    """Store projects under ``<root>/projects/<id>/``."""

    def __init__(self, root: Path) -> None:
        """Create repositories rooted at ``root``."""
        self.root = root
        self._projects = root / "projects"

    def _project_dir(self, project_id: str) -> Path:
        """Return the package directory for one project."""
        return self._projects / project_id

    def get(self, project_id: str) -> Project:
        """Load the current project package."""
        package_dir = self._project_dir(project_id)
        if not package_dir.is_dir():
            raise NotFoundError(project_id)
        return load_project_dir(package_dir)

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Load a pinned revision."""
        path = (
            self._project_dir(project_id)
            / "revisions"
            / revision
            / "project.json"
        )
        if not path.is_file():
            raise NotFoundError(f"{project_id}@{revision}")
        return project_from_dict(_read_json(path))

    def save(self, project: Project, *, revision: str | None = None) -> str:
        """Save the current package and optionally a revision snapshot."""
        rev = revision or "1"
        package_dir = self._project_dir(project.id)
        save_project_dir(package_dir, project)
        write_revision(package_dir, rev, project)
        meta_path = package_dir / "current_revision.txt"
        meta_path.write_text(rev + "\n", encoding="utf-8")
        return rev

    def list_ids(self) -> list[str]:
        """List project package directory names."""
        if not self._projects.is_dir():
            return []
        return sorted(
            path.name for path in self._projects.iterdir() if path.is_dir()
        )

    def delete(self, project_id: str) -> None:
        """Remove a project package tree."""
        package_dir = self._project_dir(project_id)
        if not package_dir.exists():
            raise NotFoundError(project_id)
        for path in sorted(package_dir.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()
        package_dir.rmdir()


class DictRunRepository:
    """Store runs under ``<root>/runs/<projectId>/<runId>/``."""

    def __init__(self, root: Path) -> None:
        """Create a run repository under ``root``."""
        self.root = root
        self._runs = root / "runs"
        self._idempotency = root / "idempotency"

    def _run_dir(self, project_id: str, run_id: str) -> Path:
        """Return the artifact directory for one run."""
        return self._runs / project_id / run_id

    def _idempotency_path(self, project_id: str, key: str) -> Path:
        """Return the idempotency index file path."""
        safe = key.replace(":", "_")
        return self._idempotency / project_id / f"{safe}.json"

    def get(self, run_id: str) -> RunRecord:
        """Find a run by scanning project run directories."""
        if not self._runs.is_dir():
            raise NotFoundError(run_id)
        for project_dir in self._runs.iterdir():
            candidate = project_dir / run_id / "run-record.json"
            if candidate.is_file():
                return RunRecord.model_validate(_read_json(candidate))
        raise NotFoundError(run_id)

    def get_by_idempotency(
        self, project_id: str, idempotency_key: str
    ) -> RunRecord | None:
        """Resolve an idempotency key to a run record."""
        index = self._idempotency_path(project_id, idempotency_key)
        if not index.is_file():
            return None
        payload = _read_json(index)
        run_id = payload["runId"]
        try:
            return self.get(run_id)
        except NotFoundError:
            logger.debug(
                "Idempotency index pointed at missing run %s",
                run_id,
                exc_info=True,
            )
            return None

    def save(self, record: RunRecord) -> None:
        """Insert a new run and its idempotency index entry."""
        existing = self.get_by_idempotency(
            record.project_id, record.idempotency_key
        )
        if existing is not None:
            if existing.request_digest != record.request_digest:
                raise ConflictError(
                    "idempotency key reused with a different request body"
                )
            raise ConflictError("idempotency key already exists")
        self._write_record(record)
        _write_json(
            self._idempotency_path(
                record.project_id, record.idempotency_key
            ),
            {
                "runId": record.run_id,
                "createdAt": record.created_at,
                "requestDigest": record.request_digest,
            },
        )

    def update(self, record: RunRecord) -> None:
        """Overwrite an existing run artifact set."""
        run_dir = self._run_dir(record.project_id, record.run_id)
        if not (run_dir / "run-record.json").is_file():
            raise NotFoundError(record.run_id)
        self._write_record(record)

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List runs for a project, newest first by createdAt."""
        project_dir = self._runs / project_id
        if not project_dir.is_dir():
            return []
        records: list[RunRecord] = []
        for run_dir in project_dir.iterdir():
            path = run_dir / "run-record.json"
            if path.is_file():
                records.append(RunRecord.model_validate(_read_json(path)))
        records.sort(key=lambda item: item.created_at, reverse=True)
        return records[:limit]

    def _write_record(self, record: RunRecord) -> None:
        """Write run-record and optional result/diff sidecars."""
        run_dir = self._run_dir(record.project_id, record.run_id)
        run_dir.mkdir(parents=True, exist_ok=True)
        _write_json(
            run_dir / "run-record.json",
            record.model_dump(mode="json", by_alias=True, exclude_none=True),
        )
        if record.results is not None:
            _write_json(
                run_dir / "run-results.json",
                record.results.model_dump(
                    mode="json", by_alias=True, exclude_none=True
                ),
            )
        if record.diff is not None:
            _write_json(
                run_dir / "run-diff.json",
                record.diff.model_dump(
                    mode="json", by_alias=True, exclude_none=True
                ),
            )


class DictArtifactStore:
    """Store opaque artifacts under ``<root>/artifacts/``."""

    def __init__(self, root: Path) -> None:
        """Create an artifact store under ``root``."""
        self.root = root / "artifacts"

    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> str:
        """Write artifact bytes and a small sidecar for content type."""
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        _write_json(
            path.with_suffix(path.suffix + ".meta.json"),
            {"contentType": content_type},
        )
        return key

    def get_bytes(self, key: str) -> bytes:
        """Read artifact bytes."""
        path = self.root / key
        if not path.is_file():
            raise NotFoundError(key)
        return path.read_bytes()
