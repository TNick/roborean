"""Human-facing diagnostics CLI for the Roborean core."""

import argparse
import json
from pathlib import Path

from .compiler import CompileError, compile_project
from .loader import load_project_path
from .runner import run_project


def _write(data: dict, output: Path | None) -> None:
    """Write JSON to a file or standard output."""
    text = json.dumps(data, indent=2, ensure_ascii=False)
    if output:
        output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)


def cmd_validate(path: Path) -> int:
    """Validate one project JSON file."""
    load_project_path(path)
    print("valid")
    return 0


def cmd_compile(path: Path, output: Path | None) -> int:
    """Compile a project and write its portable artifact."""
    compiled = compile_project(load_project_path(path))
    _write(compiled.model_dump(mode="json", by_alias=True), output)
    return 0


def cmd_run(path: Path, output: Path | None) -> int:
    """Compile and execute a project."""
    project = load_project_path(path)
    result = run_project(compile_project(project), project)
    _write(result.model_dump(mode="json", by_alias=True), output)
    return 0


def cmd_explain_bit(path: Path, bit_id: str) -> int:
    """Print one compiled bit's activation and dependency information."""
    compiled = compile_project(load_project_path(path))
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


def main() -> int:
    """Parse CLI arguments and return a process status."""
    parser = argparse.ArgumentParser(prog="roborean")
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "compile", "run"):
        command = commands.add_parser(name)
        command.add_argument("path", type=Path)
        if name != "validate":
            command.add_argument("-o", "--output", type=Path)
    explain = commands.add_parser("explain-bit")
    explain.add_argument("path", type=Path)
    explain.add_argument("bit_id")
    args = parser.parse_args()
    try:
        if args.command == "validate":
            return cmd_validate(args.path)
        if args.command == "compile":
            return cmd_compile(args.path, args.output)
        if args.command == "run":
            return cmd_run(args.path, args.output)
        return cmd_explain_bit(args.path, args.bit_id)
    except (CompileError, ValueError) as error:
        print(str(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
