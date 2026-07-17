"""Load migrated Roborean projects from JSON data and paths."""

import json
from pathlib import Path
from typing import Any

from roborean_spec import Project, migrate_project, project_from_dict


def load_project_dict(data: dict[str, Any]) -> Project:
    """Migrate, schema-validate, and parse a project dictionary."""
    return project_from_dict(migrate_project(data))


def load_project_path(path: Path) -> Project:
    """Load a project JSON file."""
    return load_project_dict(json.loads(path.read_text(encoding="utf-8")))
