"""Lockfile enforcement during compilation."""

from pathlib import Path

import pytest
from roborean_engine.compiler import (
    CompileError,
    CompileOptions,
    compile_project,
)
from roborean_storage_dict import load_project_dir


@pytest.fixture
def set_and_copy_package() -> Path:
    """Path to the package fixture with a lockfile."""
    return (
        Path(__file__).resolve().parents[4]
        / "conformance"
        / "packages"
        / "02_set_and_copy"
    )


class TestLockfileEnforcement:
    """Compile-time lockfile checks."""

    def test_matching_lockfile_compiles(
        self, set_and_copy_package: Path
    ) -> None:
        """A matching lockfile does not block compilation."""
        project = load_project_dir(set_and_copy_package)
        compiled = compile_project(
            project,
            options=CompileOptions(package_dir=set_and_copy_package),
        )
        assert compiled.project_id == project.id

    def test_mismatched_lockfile_fails(
        self, set_and_copy_package: Path, tmp_path: Path
    ) -> None:
        """Wrong pinned versions produce E_LOCKFILE_MISMATCH."""
        import json
        import shutil

        package = tmp_path / "pkg"
        shutil.copytree(set_and_copy_package, package)
        lock_path = package / "project.lock"
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        lock["bitTypes"]["roborean.set_variable"] = "9.9.9"
        lock_path.write_text(
            json.dumps(lock, indent=2) + "\n", encoding="utf-8"
        )
        project = load_project_dir(package)
        with pytest.raises(CompileError) as error:
            compile_project(
                project,
                options=CompileOptions(package_dir=package),
            )
        codes = {item.code for item in error.value.diagnostics}
        assert "E_LOCKFILE_MISMATCH" in codes
