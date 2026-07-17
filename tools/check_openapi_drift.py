"""Fail CI when OpenAPI drifts."""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMITTED = (
    ROOT / "packages" / "typescript" / "api-types" / "openapi" / "openapi.json"
)


def main() -> int:
    """Regenerate OpenAPI and compare to committed file."""
    if not COMMITTED.is_file():
        print("Missing committed openapi.json; run make openapi")
        return 1
    expected = COMMITTED.read_text(encoding="utf-8")
    subprocess.check_call([sys.executable, str(ROOT / "tools" / "export_openapi.py")])
    actual = COMMITTED.read_text(encoding="utf-8")
    if json.loads(actual) != json.loads(expected):
        print("OpenAPI drift detected")
        return 1
    print("OpenAPI check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
