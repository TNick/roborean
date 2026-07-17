"""Shared fixtures for dict storage tests."""

from pathlib import Path

import pytest
from roborean_spec import project_from_dict


@pytest.fixture
def minimal_project():
    """Return a tiny valid project model."""
    return project_from_dict(
        {
            "schemaVersion": "1.0.0",
            "id": "example.minimal",
            "name": "Minimal",
            "pluginRequirements": [],
            "workspace": {
                "variables": [
                    {
                        "key": "title",
                        "schema": {"type": "string"},
                        "defaultValue": {
                            "kind": "public_literal",
                            "dataType": "string",
                            "value": "Hello",
                        },
                        "const": False,
                        "exposure": "clientVisible",
                    }
                ]
            },
            "bits": [
                {
                    "id": "b1",
                    "type": "roborean.noop",
                    "when": True,
                    "config": {},
                    "reads": [],
                    "writes": [],
                    "emits": [],
                    "effectClass": "pure",
                    "onError": "abort",
                    "capabilities": [],
                }
            ],
            "documents": [],
            "templates": [],
            "metadata": {},
        }
    )


@pytest.fixture
def store_root(tmp_path: Path) -> Path:
    """Return a temporary store root directory."""
    root = tmp_path / "store"
    root.mkdir()
    return root
