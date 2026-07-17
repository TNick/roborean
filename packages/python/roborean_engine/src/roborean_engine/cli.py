"""Human-facing diagnostics CLI for the Roborean core."""

import argparse
import json
from pathlib import Path

from roborean_spec import Project, RunRequest, RunTrigger
from roborean_storage_base import ConflictError, NotFoundError
from roborean_storage_dict import load_project_dir

from .compiler import CompileError, CompileOptions, compile_project
from .documents import default_driver_registry
from .loader import load_project_path
from .run_service import RunService
from .runner import RunOptions, run_project, run_project_detailed
from .store import init_store, parse_store


def _write(data: dict | list, output: Path | None) -> None:
    """Write JSON to a file or standard output.

    Args:
        data: JSON-serializable payload to write.
        output: File path to write to, or ``None`` to print to stdout.
    """
    text = json.dumps(data, indent=2, ensure_ascii=False)
    if output:
        output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)


def _load_project(path: Path) -> Project:
    """Load a project from a JSON file or package directory.

    Args:
        path: Path to a project JSON file or a package directory.

    Returns:
        The loaded project definition.
    """
    if path.is_dir():
        return load_project_dir(path)
    return load_project_path(path)


def _package_dir(path: Path) -> Path | None:
    """Return a package directory when ``path`` is a directory.

    Args:
        path: Candidate project path.

    Returns:
        ``path`` when it is a directory, otherwise ``None``.
    """
    return path if path.is_dir() else None


def cmd_validate(path: Path) -> int:
    """Validate one project JSON file or package directory.

    Args:
        path: Path to a project JSON file or a package directory.

    Returns:
        Process exit status; ``0`` on success.
    """
    _load_project(path)
    print("valid")
    return 0


def cmd_compile(path: Path, output: Path | None) -> int:
    """Compile a project and write its portable artifact.

    Args:
        path: Path to a project JSON file or a package directory.
        output: File path to write the compiled artifact to, or ``None``
            to print to stdout.

    Returns:
        Process exit status; ``0`` on success.
    """
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
    """Compile and execute a project, optionally through a durable store.

    Args:
        path: Path to a project JSON file or a package directory.
        output: File path to write the run result to, or ``None`` to
            print to stdout.
        idempotency_key: Idempotency key for durable execution; required
            together with ``store`` to persist the run.
        store: Store specification for durable execution, or ``None``
            for an in-memory, non-persisted run.

    Returns:
        Process exit status; ``0`` on success, ``1`` on failure.
    """
    project = _load_project(path)
    package_dir = _package_dir(path)

    # Without a store and idempotency key, run in-memory without
    # persisting anything.
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

    # Otherwise persist the project and execute a durable, idempotent
    # run through the run service.
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
    """Print one compiled bit's activation and dependency information.

    Args:
        path: Path to a project JSON file or a package directory.
        bit_id: Identifier of the bit to explain.

    Returns:
        Process exit status; ``0`` on success.

    Raises:
        ValueError: When no bit with ``bit_id`` exists in the project.
    """
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
    """Initialize a durable store.

    Args:
        store: Store specification to initialize.

    Returns:
        Process exit status; ``0`` on success.
    """
    init_store(store)
    print(f"initialized {store}")
    return 0


def cmd_runs_list(project_id: str, store: str) -> int:
    """List durable runs for a project.

    Args:
        project_id: Identifier of the project whose runs to list.
        store: Store specification to read runs from.

    Returns:
        Process exit status; ``0`` on success.
    """
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
    """Show one durable run record.

    Args:
        run_id: Identifier of the run to show.
        store: Store specification to read the run from.

    Returns:
        Process exit status; ``0`` on success.
    """
    projects, runs, artifacts = parse_store(store)
    service = RunService(projects=projects, runs=runs, artifacts=artifacts)
    record = service.get(run_id)
    _write(record.model_dump(mode="json", by_alias=True), None)
    return 0


def cmd_runs_retry(run_id: str, store: str, *, force: bool) -> int:
    """Retry a prior durable run when policy allows.

    Args:
        run_id: Identifier of the run to retry.
        store: Store specification to read from and write to.
        force: When ``True``, bypass the retry policy check.

    Returns:
        Process exit status; ``0`` on success, ``1`` on failure.
    """
    projects, runs, artifacts = parse_store(store)
    service = RunService(projects=projects, runs=runs, artifacts=artifacts)
    record = service.retry(run_id, force=force)
    _write(record.model_dump(mode="json", by_alias=True), None)
    return 0 if record.status.value == "succeeded" else 1


def cmd_render(path: Path, out: Path) -> int:
    """Render document artifacts for a project package directory.

    Args:
        path: Path to a project package directory.
        out: Directory to write rendered artifacts and results to.

    Returns:
        Process exit status; ``0`` on success, ``1`` on failure.

    Raises:
        ValueError: When ``path`` is not a package directory.
    """
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
    """Print a document preview for a project package.

    Args:
        path: Path to a project package directory.
        document_id: Identifier of the document to preview.
        fmt: Output format: ``"html"``, ``"text"``, or ``"json"``.

    Returns:
        Process exit status; ``0`` on success, ``1`` on failure.

    Raises:
        ValueError: When ``path`` is not a package directory, or when
            no preview exists for ``document_id``.
    """
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
    """List installed document drivers.

    Returns:
        Process exit status; ``0`` on success.
    """
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
    """Parse CLI arguments and return a process status.

    Returns:
        Process exit status returned by the dispatched subcommand, or
        ``1`` when a known error is raised.
    """
    # Build the top-level parser and its subcommands.
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

    # Dispatch to the handler for the parsed subcommand, converting
    # known domain errors into a printed message and a failure status.
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
