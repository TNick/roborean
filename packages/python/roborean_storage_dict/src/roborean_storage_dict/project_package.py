"""Load and save on-disk project packages."""

import json
from pathlib import Path

from roborean_spec import (
    CompiledProject,
    Project,
    project_from_dict,
    project_to_dict,
)
from roborean_storage_base import IntegrityError, NotFoundError

from .yaml_store import dump_yaml, load_yaml


def detect_entry(package_dir: Path) -> Path:
    """Return the project entry file inside a package directory."""
    json_path = package_dir / "project.json"
    yaml_path = package_dir / "project.yaml"
    if json_path.is_file():
        return json_path
    if yaml_path.is_file():
        return yaml_path
    raise NotFoundError(f"No project.json or project.yaml in {package_dir}")


def load_project_dir(package_dir: Path) -> Project:
    """Load a project from a package directory."""
    entry = detect_entry(package_dir)
    if entry.suffix.lower() == ".yaml":
        data = load_yaml(entry)
    else:
        data = json.loads(entry.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise IntegrityError(f"Project entry is not an object: {entry}")
    return project_from_dict(data)


def save_project_dir(
    package_dir: Path,
    project: Project,
    *,
    as_yaml: bool = False,
) -> None:
    """Write a project package entry file."""
    package_dir.mkdir(parents=True, exist_ok=True)
    data = project_to_dict(project)
    if as_yaml:
        dump_yaml(package_dir / "project.yaml", data)
        return
    path = package_dir / "project.json"
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def write_revision(
    package_dir: Path,
    revision: str,
    project: Project,
    compiled: CompiledProject | None = None,
) -> None:
    """Persist one immutable project revision under revisions/."""
    revision_dir = package_dir / "revisions" / revision
    revision_dir.mkdir(parents=True, exist_ok=True)
    (revision_dir / "project.json").write_text(
        json.dumps(project_to_dict(project), indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )
    if compiled is not None:
        (revision_dir / "compiled-project.json").write_text(
            json.dumps(
                compiled.model_dump(mode="json", by_alias=True),
                indent=2,
                ensure_ascii=False,
            )
            + "\n",
            encoding="utf-8",
        )
