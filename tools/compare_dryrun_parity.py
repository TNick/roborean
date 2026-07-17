"""Compare browser dry-run vs server run for conformance fixtures."""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from roborean_engine import compile_project, load_project_path, run_project

VOLATILE = {"runId", "startedAt", "finishedAt", "durationMs", "compiledAt"}


def normalize(value: Any) -> Any:
    """Strip volatile fields."""
    if isinstance(value, dict):
        return {
            key: normalize(item)
            for key, item in value.items()
            if key not in VOLATILE
        }
    if isinstance(value, list):
        return [normalize(item) for item in value]
    return value


def main() -> int:
    """Ensure local Python runs match expected run-results."""
    root = Path(__file__).resolve().parents[1]
    failures: list[str] = []
    for fixture in sorted((root / "conformance" / "runs").iterdir()):
        expected_path = fixture / "expected.run-results.json"
        input_path = fixture / "input.project.json"
        if not expected_path.is_file() or not input_path.is_file():
            continue
        project = load_project_path(input_path)
        compiled = compile_project(project)
        actual = run_project(compiled, project, options=None)
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        if normalize(actual.model_dump(mode="json", by_alias=True)) != normalize(
            expected
        ):
            failures.append(fixture.name)
    if failures:
        print("Parity failures:", ", ".join(failures))
        return 1
    print("Dry-run parity passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
