"""Dictionary/filesystem repositories for projects and runs."""

import json
import logging
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from roborean_spec import Project, RunRecord, project_from_dict
from roborean_storage_base import ConflictError, NotFoundError

from .project_package import load_project_dir, save_project_dir, write_revision

logger = logging.getLogger(__name__)

# Windows can deny ``os.replace`` while another handle still has the
# destination open; retry briefly before surfacing the error.
_REPLACE_ATTEMPTS = 50
_REPLACE_DELAY_SECONDS = 0.01


def _read_json(path: Path) -> dict[str, Any]:
    """Load a JSON object from disk.

    Args:
        path: File to read.

    Returns:
        Parsed JSON object.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def _json_text(data: dict[str, Any]) -> str:
    """Serialize a JSON object with a trailing newline.

    Args:
        data: JSON-serializable object to write.

    Returns:
        Encoded JSON text with a trailing newline.
    """
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def _sibling_temp_path(path: Path) -> Path:
    """Return a unique temp path beside ``path``.

    Args:
        path: Final destination path.

    Returns:
        Sibling path suitable for an atomic publish.
    """
    return path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")


def _unlink_quietly(path: Path) -> None:
    """Remove ``path`` when present without raising.

    Args:
        path: File to delete.
    """
    if not path.is_file():
        return
    try:
        path.unlink()
    except OSError:
        logger.debug(
            "Could not remove temporary file %s",
            path,
            exc_info=True,
        )


def _replace_with_retry(tmp_path: Path, path: Path) -> None:
    """Replace ``path`` with ``tmp_path``, retrying Windows share conflicts.

    Args:
        tmp_path: Fully written temporary file.
        path: Final destination path.

    Raises:
        OSError: When replacement still fails after retries.
    """
    for attempt in range(_REPLACE_ATTEMPTS):
        try:
            os.replace(tmp_path, path)
            return
        except PermissionError:
            if attempt + 1 >= _REPLACE_ATTEMPTS:
                raise
            logger.debug(
                "Retrying atomic replace of %s after share conflict",
                path,
                exc_info=True,
            )
            time.sleep(_REPLACE_DELAY_SECONDS)


def _write_json(path: Path, data: dict[str, Any]) -> None:
    """Write a JSON object atomically with a trailing newline.

    Args:
        path: Destination file.
        data: JSON-serializable object to write.
    """
    path.parent.mkdir(parents=True, exist_ok=True)

    # Publish via a sibling temp file so concurrent readers never see a
    # truncated document from an in-place overwrite.
    tmp_path = _sibling_temp_path(path)
    try:
        tmp_path.write_text(_json_text(data), encoding="utf-8")
        _replace_with_retry(tmp_path, path)
    except OSError:
        _unlink_quietly(tmp_path)
        raise


def _create_json_exclusive(path: Path, data: dict[str, Any]) -> None:
    """Create ``path`` with JSON only when it does not already exist.

    Args:
        path: Destination file that must not already exist.
        data: JSON-serializable object to write.

    Raises:
        FileExistsError: When ``path`` already exists.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    text = _json_text(data)
    tmp_path = _sibling_temp_path(path)
    tmp_path.write_text(text, encoding="utf-8")
    try:
        # Prefer a hard link so the final name appears with full content
        # in one step when the filesystem supports it.
        try:
            os.link(tmp_path, path)
            return
        except FileExistsError:
            raise
        except OSError:
            logger.debug(
                "Hard link unavailable for exclusive create of %s",
                path,
                exc_info=True,
            )

        # Fallback: exclusive empty create as a claim, then replace with
        # the complete document.
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        _replace_with_retry(tmp_path, path)
    finally:
        _unlink_quietly(tmp_path)


def _idempotency_index_payload(record: RunRecord) -> dict[str, Any]:
    """Build the on-disk idempotency index document for a new run.

    Args:
        record: Run record being inserted.

    Returns:
        JSON object stored under ``idempotency/``.
    """
    return {
        "runId": record.run_id,
        "createdAt": record.created_at,
        "requestDigest": record.request_digest,
    }


def _raise_idempotency_conflict(index_path: Path, record: RunRecord) -> None:
    """Raise ``ConflictError`` after an idempotency key is already claimed.

    Args:
        index_path: Existing idempotency index file.
        record: Run record that lost the create race.

    Raises:
        ConflictError: When the key exists for the same or a different body.
    """
    payload = _read_json(index_path)
    existing_digest = payload.get("requestDigest")
    if existing_digest and existing_digest != record.request_digest:
        raise ConflictError(
            "idempotency key reused with a different request body"
        )
    raise ConflictError("idempotency key already exists")


class DictProjectRepository:
    """Store projects under ``<root>/projects/<id>/``.

    Attributes:
        root: Storage root directory.
        _projects: Directory holding one subdirectory per project.
    """

    root: Path

    _projects: Path

    def __init__(self, root: Path) -> None:
        """Create repositories rooted at ``root``.

        Args:
            root: Storage root directory.
        """
        self.root = root
        self._projects = root / "projects"

    def _project_dir(self, project_id: str) -> Path:
        """Return the package directory for one project.

        Args:
            project_id: Project identifier.

        Returns:
            Package directory for ``project_id``.
        """
        return self._projects / project_id

    def get(self, project_id: str) -> Project:
        """Load the current project package.

        Args:
            project_id: Project identifier.

        Returns:
            Validated ``Project`` model.

        Raises:
            NotFoundError: When the project package does not exist.
        """
        package_dir = self._project_dir(project_id)
        if not package_dir.is_dir():
            raise NotFoundError(project_id)
        return load_project_dir(package_dir)

    def get_revision(self, project_id: str, revision: str) -> Project:
        """Load a pinned revision.

        Args:
            project_id: Project identifier.
            revision: Revision identifier to load.

        Returns:
            Validated ``Project`` model for the revision.

        Raises:
            NotFoundError: When the revision snapshot does not exist.
        """
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
        """Save the current package and optionally a revision snapshot.

        Args:
            project: Project model to persist.
            revision: Revision identifier to write; defaults to ``"1"``.

        Returns:
            Revision identifier that was written.
        """
        rev = revision or "1"
        package_dir = self._project_dir(project.id)
        save_project_dir(package_dir, project)
        write_revision(package_dir, rev, project)
        meta_path = package_dir / "current_revision.txt"
        meta_path.write_text(rev + "\n", encoding="utf-8")
        return rev

    def list_ids(self) -> list[str]:
        """List project package directory names.

        Returns:
            Sorted list of project identifiers.
        """
        if not self._projects.is_dir():
            return []
        return sorted(
            path.name for path in self._projects.iterdir() if path.is_dir()
        )

    def delete(self, project_id: str) -> None:
        """Remove a project package tree.

        Args:
            project_id: Project identifier.

        Raises:
            NotFoundError: When the project package does not exist.
        """
        package_dir = self._project_dir(project_id)
        if not package_dir.exists():
            raise NotFoundError(project_id)

        # Remove files and directories bottom-up so parents are empty.
        for path in sorted(package_dir.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()
        package_dir.rmdir()

    def get_file(self, project_id: str, relative_path: str) -> bytes:
        """Read one project package file.

        Args:
            project_id: Project identifier.
            relative_path: Path relative to the package root.

        Returns:
            Raw file bytes.

        Raises:
            NotFoundError: When the file does not exist.
        """
        path = self._project_dir(project_id) / relative_path
        if not path.is_file():
            raise NotFoundError(relative_path)
        return path.read_bytes()

    def put_file(
        self, project_id: str, relative_path: str, data: bytes
    ) -> None:
        """Write one project package file.

        Args:
            project_id: Project identifier.
            relative_path: Path relative to the package root.
            data: Raw file bytes to persist.
        """
        path = self._project_dir(project_id) / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def delete_file(self, project_id: str, relative_path: str) -> None:
        """Remove one project package file when present.

        Args:
            project_id: Project identifier.
            relative_path: Path relative to the package root.
        """
        path = self._project_dir(project_id) / relative_path
        if path.is_file():
            path.unlink()

    def list_files(self, project_id: str) -> list[str]:
        """List relative package file paths for one project.

        Args:
            project_id: Project identifier.

        Returns:
            Sorted relative paths under the package directory.
        """
        package_dir = self._project_dir(project_id)
        if not package_dir.is_dir():
            return []
        return sorted(
            str(path.relative_to(package_dir)).replace("\\", "/")
            for path in package_dir.rglob("*")
            if path.is_file()
            and path.name != "project.json"
            and path.name != "project.yaml"
            and "revisions" not in path.parts
            and path.name != "current_revision.txt"
        )


class DictRunRepository:
    """Store runs under ``<root>/runs/<projectId>/<runId>/``.

    Attributes:
        root: Storage root directory.
        _runs: Directory holding one subdirectory per project's runs.
        _idempotency: Directory holding idempotency key indexes.
        _lock: Re-entrant lock serializing in-process run I/O.
    """

    root: Path

    _runs: Path
    _idempotency: Path
    _lock: threading.RLock

    def __init__(self, root: Path) -> None:
        """Create a run repository under ``root``.

        Args:
            root: Storage root directory.
        """
        self.root = root
        self._runs = root / "runs"
        self._idempotency = root / "idempotency"
        self._lock = threading.RLock()

    def _run_dir(self, project_id: str, run_id: str) -> Path:
        """Return the artifact directory for one run.

        Args:
            project_id: Project identifier owning the run.
            run_id: Run identifier.

        Returns:
            Artifact directory for the run.
        """
        return self._runs / project_id / run_id

    def _idempotency_path(self, project_id: str, key: str) -> Path:
        """Return the idempotency index file path.

        Args:
            project_id: Project identifier owning the key.
            key: Idempotency key.

        Returns:
            Path to the idempotency index file.
        """
        safe = key.replace(":", "_")
        return self._idempotency / project_id / f"{safe}.json"

    def get(self, run_id: str) -> RunRecord:
        """Find a run by scanning project run directories.

        Args:
            run_id: Run identifier to find.

        Returns:
            Validated ``RunRecord`` for the run.

        Raises:
            NotFoundError: When no matching run directory exists.
        """
        with self._lock:
            if not self._runs.is_dir():
                raise NotFoundError(run_id)

            # Scan every project's run directory for a matching run id.
            for project_dir in self._runs.iterdir():
                candidate = project_dir / run_id / "run-record.json"
                if candidate.is_file():
                    return RunRecord.model_validate(_read_json(candidate))
            raise NotFoundError(run_id)

    def get_by_idempotency(
        self, project_id: str, idempotency_key: str
    ) -> RunRecord | None:
        """Resolve an idempotency key to a run record.

        Args:
            project_id: Project identifier owning the key.
            idempotency_key: Idempotency key to resolve.

        Returns:
            Matching ``RunRecord``, or ``None`` when the key is unknown
            or points at a run that no longer exists.
        """
        with self._lock:
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
        """Insert a new run and its idempotency index entry.

        Args:
            record: Run record to persist.

        Raises:
            ConflictError: When the idempotency key already exists,
                either for the same or a different request body.
        """
        with self._lock:
            existing = self.get_by_idempotency(
                record.project_id, record.idempotency_key
            )
            if existing is not None:
                if existing.request_digest != record.request_digest:
                    raise ConflictError(
                        "idempotency key reused with a different "
                        "request body"
                    )
                raise ConflictError("idempotency key already exists")

            # Claim the idempotency slot before writing run artifacts so
            # parallel writers cannot insert two runs for one key.
            index_path = self._idempotency_path(
                record.project_id, record.idempotency_key
            )
            try:
                _create_json_exclusive(
                    index_path, _idempotency_index_payload(record)
                )
            except FileExistsError:
                _raise_idempotency_conflict(index_path, record)

            try:
                self._write_record(record)
            except OSError:
                logger.debug(
                    "Run record write failed after idempotency claim " "for %s",
                    record.run_id,
                    exc_info=True,
                )
                if index_path.is_file():
                    try:
                        payload = _read_json(index_path)
                        if payload.get("runId") == record.run_id:
                            index_path.unlink()
                    except OSError:
                        logger.debug(
                            "Could not roll back idempotency index %s",
                            index_path,
                            exc_info=True,
                        )
                raise

    def update(self, record: RunRecord) -> None:
        """Overwrite an existing run artifact set.

        Args:
            record: Run record to persist.

        Raises:
            NotFoundError: When no existing run record is present.
        """
        with self._lock:
            run_dir = self._run_dir(record.project_id, record.run_id)
            if not (run_dir / "run-record.json").is_file():
                raise NotFoundError(record.run_id)
            self._write_record(record)

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List runs for a project, newest first by createdAt.

        Args:
            project_id: Project identifier.
            limit: Maximum number of run records to return.

        Returns:
            Run records sorted newest first, capped at ``limit``.
        """
        with self._lock:
            project_dir = self._runs / project_id
            if not project_dir.is_dir():
                return []

            # Collect every run-record.json under the project's run
            # directory.
            records: list[RunRecord] = []
            for run_dir in project_dir.iterdir():
                path = run_dir / "run-record.json"
                if path.is_file():
                    records.append(RunRecord.model_validate(_read_json(path)))
            records.sort(key=lambda item: item.created_at, reverse=True)
            return records[:limit]

    def _write_record(self, record: RunRecord) -> None:
        """Write run-record and optional result/diff sidecars.

        Args:
            record: Run record to persist.
        """
        run_dir = self._run_dir(record.project_id, record.run_id)
        run_dir.mkdir(parents=True, exist_ok=True)
        _write_json(
            run_dir / "run-record.json",
            record.model_dump(mode="json", by_alias=True, exclude_none=True),
        )

        # Persist optional result and diff sidecars when present.
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
    """Store opaque artifacts under ``<root>/artifacts/``.

    Attributes:
        root: Artifact storage directory.
    """

    root: Path

    def __init__(self, root: Path) -> None:
        """Create an artifact store under ``root``.

        Args:
            root: Storage root directory; artifacts live under
                ``root / "artifacts"``.
        """
        self.root = root / "artifacts"

    def put_bytes(self, key: str, data: bytes, *, content_type: str) -> str:
        """Write artifact bytes and a small sidecar for content type.

        Args:
            key: Artifact key, relative to the artifact store root.
            data: Raw artifact bytes.
            content_type: MIME type stored alongside the artifact.

        Returns:
            The artifact ``key`` that was written.
        """
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        _write_json(
            path.with_suffix(path.suffix + ".meta.json"),
            {"contentType": content_type},
        )
        return key

    def get_bytes(self, key: str) -> bytes:
        """Read artifact bytes.

        Args:
            key: Artifact key, relative to the artifact store root.

        Returns:
            Raw artifact bytes.

        Raises:
            NotFoundError: When no artifact exists for ``key``.
        """
        path = self.root / key
        if not path.is_file():
            raise NotFoundError(key)
        return path.read_bytes()
