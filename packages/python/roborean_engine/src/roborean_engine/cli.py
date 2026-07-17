"""Human-facing diagnostics CLI for the Roborean core."""

import argparse
import json
from pathlib import Path

from roborean_spec import RunRequest, RunTrigger
from roborean_storage_base import ConflictError, NotFoundError
from roborean_storage_dict import load_project_dir

from .compiler import CompileError, CompileOptions, compile_project
from .documents import default_driver_registry
from .loader import load_project_path
from .run_service import RunService
from .runner import RunOptions, run_project, run_project_detailed
from .store import init_store, parse_store


def _write(data: dict | list, output: Path | None) -> None:
    """Write JSON to a file or standard output."""
    text = json.dumps(data, indent=2, ensure_ascii=False)
    if output:
        output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)


def _load_project(path: Path):
    """Load a project from a JSON file or package directory."""
    if path.is_dir():
        return load_project_dir(path)
    return load_project_path(path)


def _package_dir(path: Path) -> Path | None:
    """Return a package directory when ``path`` is a directory."""
    return path if path.is_dir() else None


def cmd_validate(path: Path) -> int:
    """Validate one project JSON file or package directory."""
    _load_project(path)
    print("valid")
    return 0


def cmd_compile(path: Path, output: Path | None) -> int:
    """Compile a project and write its portable artifact."""
    project = _load_project(path)
    compiled = compile_project(
        project,
        options=CompileOptions(package_dir=_package_dir(path)),
    )
    _write(compiled.model_dump(mode="json", by_alias=True), output)
    return 0


def cmd_run(
    path: Path,
    output: Path | None,
    *,
    idempotency_key: str | None,
    store: str | None,
) -> int:
    """Compile and execute a project, optionally through a durable store."""
    project = _load_project(path)
    package_dir = _package_dir(path)
    if store is None or idempotency_key is None:
        compiled = compile_project(
            project,
            options=CompileOptions(package_dir=package_dir),
        )
        result = run_project(
            compiled,
            project,
            options=RunOptions(package_dir=package_dir),
        )
        _write(result.model_dump(mode="json", by_alias=True), output)
        return 0

    projects, runs, artifacts = parse_store(store)
    projects.save(project, revision="1")
    service = RunService(projects=projects, runs=runs, artifacts=artifacts)
    record = service.create_and_execute(
        RunRequest(
            projectId=project.id,
            projectRevision="1",
            idempotencyKey=idempotency_key,
            trigger=RunTrigger.CLI,
        )
    )
    _write(record.model_dump(mode="json", by_alias=True), output)
    return 0 if record.status.value == "succeeded" else 1


def cmd_explain_bit(path: Path, bit_id: str) -> int:
    """Print one compiled bit's activation and dependency information."""
    project = _load_project(path)
    compiled = compile_project(
        project,
        options=CompileOptions(package_dir=_package_dir(path)),
    )
    for bit in compiled.bits:
        if bit["id"] == bit_id:
            _write(
                {
                    "bit": bit,
                    "activation": compiled.activation_expressions[
                        bit_id
                    ].model_dump(),
                    "dependencies": compiled.dependency_map[bit_id],
                },
                None,
            )
            return 0
    raise ValueError(f"Unknown bit ID: {bit_id}")


def cmd_store_init(store: str) -> int:
    """Initialize a durable store."""
    init_store(store)
    print(f"initialized {store}")
    return 0


def cmd_runs_list(project_id: str, store: str) -> int:
    """List durable runs for a project."""
    projects, runs, artifacts = parse_store(store)
    service = RunService(projects=projects, runs=runs, artifacts=artifacts)
    records = service.list_for_project(project_id)
    _write(
        [
            {
                "runId": item.run_id,
                "status": item.status.value,
                "idempotencyKey": item.idempotency_key,
                "createdAt": item.created_at,
            }
            for item in records
        ],
        None,
    )
    return 0


def cmd_runs_show(run_id: str, store: str) -> int:
    """Show one durable run record."""
    projects, runs, artifacts = parse_store(store)
    service = RunService(projects=projects, runs=runs, artifacts=artifacts)
    record = service.get(run_id)
    _write(record.model_dump(mode="json", by_alias=True), None)
    return 0


def cmd_runs_retry(run_id: str, store: str, *, force: bool) -> int:
    """Retry a prior durable run when policy allows."""
    projects, runs, artifacts = parse_store(store)
    service = RunService(projects=projects, runs=runs, artifacts=artifacts)
    record = service.retry(run_id, force=force)
    _write(record.model_dump(mode="json", by_alias=True), None)
    return 0 if record.status.value == "succeeded" else 1


def cmd_render(path: Path, out: Path) -> int:
    """Render document artifacts for a project package directory."""
    if not path.is_dir():
        raise ValueError("render requires a project package directory")
    project = load_project_dir(path)
    compiled = compile_project(
        project, options=CompileOptions(package_dir=path)
    )
    outcome = run_project_detailed(
        compiled,
        project,
        options=RunOptions(package_dir=path, artifact_root=out),
    )
    out.mkdir(parents=True, exist_ok=True)
    for document_id, payload in outcome.artifact_payloads.items():
        # Paths already written via artifact_root; echo summary.
        _ = document_id, payload
    _write(
        outcome.results.model_dump(mode="json", by_alias=True),
        out / "run-results.json",
    )
    print(f"rendered {len(outcome.artifact_payloads)} artifact(s) to {out}")
    return 0 if outcome.results.status == "success" else 1


def cmd_preview(path: Path, document_id: str, fmt: str) -> int:
    """Print a document preview for a project package."""
    if not path.is_dir():
        raise ValueError("preview requires a project package directory")
    project = load_project_dir(path)
    compiled = compile_project(
        project, options=CompileOptions(package_dir=path)
    )
    outcome = run_project_detailed(
        compiled, project, options=RunOptions(package_dir=path)
    )
    if document_id not in outcome.previews:
        raise ValueError(f"No preview for document {document_id}")
    preview = outcome.previews[document_id]
    if fmt == "json":
        _write(preview, None)
    else:
        body = preview.get("body")
        print(body if isinstance(body, str) else json.dumps(body, indent=2))
    return 0 if outcome.results.status == "success" else 1


def cmd_drivers_list() -> int:
    """List installed document drivers."""
    registry = default_driver_registry()
    rows = []
    for driver_id, manifest in registry.manifests().items():
        rows.append(
            {
                "driverId": driver_id,
                "version": manifest.version,
                "irFamily": manifest.ir_family,
                "requiresBackend": manifest.requires_backend,
                "capabilities": manifest.capabilities,
            }
        )
    _write(rows, None)
    return 0


def main() -> int:
    """Parse CLI arguments and return a process status."""
    parser = argparse.ArgumentParser(prog="roborean")
    commands = parser.add_subparsers(dest="command", required=True)

    for name in ("validate", "compile"):
        command = commands.add_parser(name)
        command.add_argument("path", type=Path)
        if name == "compile":
            command.add_argument("-o", "--output", type=Path)

    run = commands.add_parser("run")
    run.add_argument("path", type=Path)
    run.add_argument("-o", "--output", type=Path)
    run.add_argument("--idempotency-key")
    run.add_argument("--store")

    explain = commands.add_parser("explain-bit")
    explain.add_argument("path", type=Path)
    explain.add_argument("bit_id")

    store_init = commands.add_parser("store")
    store_sub = store_init.add_subparsers(dest="store_command", required=True)
    init_cmd = store_sub.add_parser("init")
    init_cmd.add_argument("--store", required=True)

    runs = commands.add_parser("runs")
    runs_sub = runs.add_subparsers(dest="runs_command", required=True)
    runs_list = runs_sub.add_parser("list")
    runs_list.add_argument("--project", required=True)
    runs_list.add_argument("--store", required=True)
    runs_show = runs_sub.add_parser("show")
    runs_show.add_argument("run_id")
    runs_show.add_argument("--store", required=True)
    runs_retry = runs_sub.add_parser("retry")
    runs_retry.add_argument("run_id")
    runs_retry.add_argument("--store", required=True)
    runs_retry.add_argument(
        "--force",
        "--i-understand-side-effects",
        action="store_true",
    )

    render = commands.add_parser("render")
    render.add_argument("path", type=Path)
    render.add_argument("--out", type=Path, required=True)

    preview = commands.add_parser("preview")
    preview.add_argument("path", type=Path)
    preview.add_argument("--document", required=True)
    preview.add_argument(
        "--format", choices=("html", "text", "json"), default="text"
    )

    drivers = commands.add_parser("drivers")
    drivers_sub = drivers.add_subparsers(dest="drivers_command", required=True)
    drivers_sub.add_parser("list")

    args = parser.parse_args()
    try:
        if args.command == "validate":
            return cmd_validate(args.path)
        if args.command == "compile":
            return cmd_compile(args.path, args.output)
        if args.command == "run":
            return cmd_run(
                args.path,
                args.output,
                idempotency_key=args.idempotency_key,
                store=args.store,
            )
        if args.command == "explain-bit":
            return cmd_explain_bit(args.path, args.bit_id)
        if args.command == "store":
            return cmd_store_init(args.store)
        if args.command == "runs":
            if args.runs_command == "list":
                return cmd_runs_list(args.project, args.store)
            if args.runs_command == "show":
                return cmd_runs_show(args.run_id, args.store)
            return cmd_runs_retry(args.run_id, args.store, force=args.force)
        if args.command == "render":
            return cmd_render(args.path, args.out)
        if args.command == "preview":
            return cmd_preview(args.path, args.document, args.format)
        return cmd_drivers_list()
    except (CompileError, ValueError, ConflictError, NotFoundError) as error:
        print(str(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
