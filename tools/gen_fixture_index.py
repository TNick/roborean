"""Print a stable index of conformance fixture paths."""

from pathlib import Path


def main() -> int:
    """List conformance directories and JSON fixtures."""
    root = Path(__file__).resolve().parents[1] / "conformance"
    if not root.is_dir():
        print("Missing conformance/")
        return 1

    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        if path.suffix not in {".json", ".md", ".txt", ".yaml", ".yml"}:
            continue
        print(path.relative_to(root.parent).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
