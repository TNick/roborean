"""Run Python conformance fixtures against their expected outcome."""

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from roborean_engine import compile_project, load_project_path, run_project

VOLATILE = {"runId", "startedAt", "finishedAt", "durationMs", "compiledAt"}


def normalize(value: Any) -> Any:
    """Remove volatile fields recursively before comparing JSON values."""
    if isinstance(value, dict):
        return {
            key: normalize(item)
            for key, item in value.items()
            if key not in VOLATILE
        }
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return value


def _run_python(root: Path, write: bool) -> list[str]:
    """Compare or write Python engine outputs for each run fixture."""
    runs = root / "conformance" / "runs"
    if write:
        for source in sorted(
            (root / "conformance" / "projects").glob("0[1-4]_*.json")
        ):
            fixture = runs / source.stem
            fixture.mkdir(parents=True, exist_ok=True)
            (fixture / "input.project.json").write_text(
                source.read_text(encoding="utf-8"),
                encoding="utf-8",
            )
    failures: list[str] = []
    for fixture in sorted(runs.glob("*")):
        if not fixture.is_dir():
            continue
        project = load_project_path(fixture / "input.project.json")
        compiled = compile_project(project)
        result = run_project(compiled, project, options=None)
        actuals = {
            "expected.compiled.json": compiled.model_dump(
                mode="json", by_alias=True
            ),
            "expected.run-results.json": result.model_dump(
                mode="json", by_alias=True
            ),
        }
        for name, actual in actuals.items():
            expected_path = fixture / name
            if write:
                expected_path.write_text(
                    json.dumps(actual, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8",
                )
                continue
            if not expected_path.is_file():
                failures.append(f"{fixture.name}: missing {name}")
                continue
            expected = json.loads(expected_path.read_text(encoding="utf-8"))
            if normalize(actual) != normalize(expected):
                failures.append(f"{fixture.name}: {name} mismatch")
    return failures


def _pnpm_executable() -> str:
    """Resolve the ``pnpm`` executable on PATH.

    Returns:
        Absolute path to ``pnpm`` (or ``pnpm.cmd`` on Windows).

    Raises:
        FileNotFoundError: When pnpm is not available.
    """
    executable = shutil.which("pnpm")
    if executable is None:
        raise FileNotFoundError("pnpm executable not found on PATH")
    return executable


def _run_typescript(root: Path) -> list[str]:
    """Execute the TypeScript package conformance Vitest suite."""
    # Do not use shell=True: on POSIX a argv list becomes
    # ``sh -c pnpm --filter ...`` and only ``pnpm`` runs (no filter).
    try:
        command = [
            _pnpm_executable(),
            "--filter",
            "@roborean/engine",
            "test",
        ]
    except FileNotFoundError as error:
        return [f"typescript conformance failed:\n{error}"]

    completed = subprocess.run(
        command,
        cwd=root,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode == 0:
        return []
    detail = (completed.stdout or "") + (completed.stderr or "")
    return [f"typescript conformance failed:\n{detail.strip()}"]


def main() -> int:
    """Run Python fixtures and optional TypeScript parity checks."""
    root = Path(__file__).resolve().parents[1]
    write = "--write" in sys.argv
    skip_ts = "--python-only" in sys.argv
    failures = _run_python(root, write)
    if not write and not skip_ts:
        failures.extend(_run_typescript(root))
    if failures:
        print("\n".join(failures))
        return 1
    print("Conformance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
