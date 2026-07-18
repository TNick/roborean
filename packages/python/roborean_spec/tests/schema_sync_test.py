"""Schema synchronization gate used in CI via tools/check_schema_sync.py."""

import subprocess
import sys
from pathlib import Path


class TestSchemaSync:
    """Run the repository schema sync checker."""

    def test_check_schema_sync_passes(self) -> None:
        """Fail when canonical schemas drift from bindings."""
        root = Path(__file__).resolve().parents[4]
        script = root / "tools" / "check_schema_sync.py"
        completed = subprocess.run(
            [sys.executable, str(script)],
            cwd=root,
            check=False,
            capture_output=True,
            text=True,
        )
        assert completed.returncode == 0, completed.stdout + completed.stderr
