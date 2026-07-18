"""Materialize SQL-backed projects as on-disk package directories."""

import json
import logging
import shutil
import tempfile
from pathlib import Path

from roborean_spec import Project, project_to_dict
from roborean_storage_base import NotFoundError

logger = logging.getLogger(__name__)


def materialize_project_package(
    repo: object,
    project: Project,
) -> Path | None:
    """Return an on-disk package directory for compile/preview.

    Dict repositories already store packages on disk and are returned
    as-is. SQL repositories are materialized into a temporary directory
    from ``project_files`` rows plus the current project JSON entry.

    Args:
        repo: Project repository (dict or SQLAlchemy adapter).
        project: Current project document.

    Returns:
        Package directory path, or ``None`` when unavailable.
    """
    project_dir = getattr(repo, "_project_dir", None)
    if callable(project_dir):
        path = project_dir(project.id)
        if path.is_dir():
            return path

    list_files = getattr(repo, "list_files", None)
    get_file = getattr(repo, "get_file", None)
    if not callable(list_files) or not callable(get_file):
        return None

    temp_root = Path(tempfile.mkdtemp(prefix="roborean-pkg-"))
    package_dir = temp_root / project.id
    package_dir.mkdir(parents=True, exist_ok=True)
    entry = package_dir / "project.json"
    entry.write_text(
        json.dumps(project_to_dict(project), indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )

    try:
        for relative_path in list_files(project.id):
            try:
                data = get_file(project.id, relative_path)
            except NotFoundError:
                logger.debug(
                    "Skipping missing project file %s for %s",
                    relative_path,
                    project.id,
                    exc_info=True,
                )
                continue
            target = package_dir / relative_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    except OSError:
        logger.debug(
            "Failed to materialize project package for %s",
            project.id,
            exc_info=True,
        )
        shutil.rmtree(temp_root, ignore_errors=True)
        return None

    return package_dir
