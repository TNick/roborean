"""Tests for on-disk project packages."""

from pathlib import Path

import pytest
import yaml
from roborean_storage_base import IntegrityError
from roborean_storage_dict import (
    DictProjectRepository,
    dump_yaml,
    load_project_dir,
    load_yaml,
    save_project_dir,
)


class TestProjectPackage:
    """Round-trip package loading."""

    def test_json_roundtrip(self, tmp_path: Path, minimal_project) -> None:
        """JSON packages reload identically."""
        package = tmp_path / "pkg"
        save_project_dir(package, minimal_project)
        loaded = load_project_dir(package)
        assert loaded.id == minimal_project.id
        assert loaded.name == minimal_project.name

    def test_yaml_roundtrip(self, tmp_path: Path, minimal_project) -> None:
        """YAML packages reload identically."""
        package = tmp_path / "pkg"
        save_project_dir(package, minimal_project, as_yaml=True)
        loaded = load_project_dir(package)
        assert loaded.id == minimal_project.id

    def test_repo_save_get(self, store_root: Path, minimal_project) -> None:
        """Dict project repository saves and loads."""
        repo = DictProjectRepository(store_root)
        rev = repo.save(minimal_project, revision="1")
        assert rev == "1"
        assert repo.get(minimal_project.id).id == minimal_project.id
        loaded = repo.get_revision(minimal_project.id, "1")
        assert loaded.id == minimal_project.id


class TestYamlSafe:
    """YAML loading must reject unsafe tags."""

    def test_rejects_python_object_tag(self, tmp_path: Path) -> None:
        """Python object tags are rejected by safe_load."""
        path = tmp_path / "evil.yaml"
        path.write_text("!!python/object/apply:os.system ['echo hi']\n")
        with pytest.raises((IntegrityError, yaml.YAMLError)):
            load_yaml(path)

    def test_accepts_mapping(self, tmp_path: Path) -> None:
        """Plain mappings load."""
        path = tmp_path / "ok.yaml"
        dump_yaml(path, {"a": 1})
        assert load_yaml(path) == {"a": 1}
