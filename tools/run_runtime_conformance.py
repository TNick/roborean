"""Run idempotency, retry, and persistence conformance vectors."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from roborean_engine import RunService, load_project_dict, load_project_path
from roborean_engine.compiler import compile_project, compute_project_digest
from roborean_engine.retry import decide_retry
from roborean_spec import RunRequest, migrate_project
from roborean_storage_base import ConflictError
from roborean_storage_dict import (
    DictArtifactStore,
    DictProjectRepository,
    DictRunRepository,
    load_project_dir,
    save_project_dir,
)

ROOT = Path(__file__).resolve().parents[1]


def _package_dir(relative: str) -> Path:
    """Resolve a conformance package path."""
    return ROOT / "conformance" / relative


def _run_idempotency_fixtures(tmp: Path) -> list[str]:
    """Execute JSON idempotency vectors."""
    failures: list[str] = []
    store_root = tmp / "idempotency"
    store_root.mkdir(parents=True, exist_ok=True)
    service = RunService(
        projects=DictProjectRepository(store_root),
        runs=DictRunRepository(store_root),
        artifacts=DictArtifactStore(store_root),
    )

    for path in sorted((ROOT / "conformance" / "idempotency").glob("*.json")):
        vector = json.loads(path.read_text(encoding="utf-8"))
        package = _package_dir(vector["projectPackage"])
        project = load_project_dir(package)
        service.projects.save(project, revision="1")
        request = RunRequest.model_validate(vector["request"])
        request = request.model_copy(update={"projectRevision": "1"})

        if vector["expected"].get("conflict"):
            conflict = RunRequest.model_validate(vector["conflictRequest"])
            conflict = conflict.model_copy(update={"projectRevision": "1"})
            service.create_and_execute(request)
            try:
                service.create_and_execute(conflict)
                failures.append(f"{vector['id']}: expected ConflictError")
            except ConflictError:
                pass
            continue

        runs = []
        for _action in vector.get("actions", []):
            runs.append(service.create_and_execute(request))

        if vector["expected"].get("sameRunId") and len(runs) >= 2:
            if runs[0].run_id != runs[1].run_id:
                failures.append(f"{vector['id']}: run ids differ")

    return failures


def _run_retry_fixtures() -> list[str]:
    """Evaluate retry policy JSON vectors."""
    failures: list[str] = []
    for path in sorted((ROOT / "conformance" / "retry").glob("*.json")):
        vector = json.loads(path.read_text(encoding="utf-8"))
        if "projectPackage" in vector:
            project = load_project_dir(_package_dir(vector["projectPackage"]))
        else:
            project = load_project_dict(vector["project"])
        compiled = compile_project(project)
        decision = decide_retry(project, compiled, force=False)
        allowed = vector["expected"]["retryAllowed"]
        if decision.allowed != allowed:
            failures.append(
                f"{vector['id']}: retry allowed={decision.allowed}, "
                f"expected {allowed}"
            )
    return failures


def _run_persistence_roundtrip(tmp: Path) -> list[str]:
    """Round-trip a dict package and compare digests."""
    source = _package_dir("packages/02_set_and_copy")
    original = load_project_dir(source)
    target = tmp / "roundtrip" / "02_set_and_copy"
    save_project_dir(target, original)
    reloaded = load_project_dir(target)
    if compute_project_digest(original) != compute_project_digest(reloaded):
        return ["dict_roundtrip: digest mismatch after save/load"]
    return []


def _run_migration_fixture() -> list[str]:
    """Ensure the 1.0.0 migration fixture reaches 1.1.0."""
    path = ROOT / "conformance" / "projects" / "07_migrated_from_1_0.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    migrated = migrate_project(data, target="1.1.0")
    if migrated.get("schemaVersion") != "1.1.0":
        return ["07_migrated_from_1_0: schemaVersion not 1.1.0"]
    project = load_project_path(path)
    if project.schema_version != "1.1.0":
        return ["07_migrated_from_1_0: loader did not migrate"]
    return []


def main() -> int:
    """Run runtime conformance checks."""
    failures: list[str] = []
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        failures.extend(_run_idempotency_fixtures(tmp))
        failures.extend(_run_persistence_roundtrip(tmp))
    failures.extend(_run_retry_fixtures())
    failures.extend(_run_migration_fixture())
    if failures:
        print("\n".join(failures))
        return 1
    print("Runtime conformance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
