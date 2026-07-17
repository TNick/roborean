"""Install e2e-ai from a local checkout or PyPI."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    """Install editable e2e-ai when E2E_AI_PATH exists, else PyPI."""
    default = Path("D:/prog/__py_libs__/e2e-ai")
    root = Path(__file__).resolve().parents[1]
    raw = os.environ.get("E2E_AI_PATH", str(default))
    local = Path(raw)
    if not local.is_absolute():
        local = (root / local).resolve()
    cmd: list[str]
    if (local / "pyproject.toml").is_file():
        cmd = [sys.executable, "-m", "pip", "install", "-e", str(local)]
    else:
        cmd = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--isolated",
            "--index-url",
            "https://pypi.org/simple/",
            "e2e-ai",
        ]
    subprocess.check_call(cmd)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
