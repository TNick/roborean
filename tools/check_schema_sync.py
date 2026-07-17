"""Verify canonical JSON Schema files carry stable identifiers."""

import json
import sys
from pathlib import Path


def main() -> int:
    """Check every schema file has a canonical $id."""
    root = Path(__file__).resolve().parents[1]
    missing = []
    paths = list((root / "schemas").glob("*.schema.json"))
    paths.append(root / "schemas" / "meta" / "schema-version.json")
    for path in paths:
        data = json.loads(path.read_text(encoding="utf-8"))
        if "$id" not in data:
            missing.append(path.relative_to(root))
    if missing:
        print("Schemas without $id:", *missing, sep="\n")
        return 1
    print("All schemas include $id.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
