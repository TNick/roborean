"""Shared fixtures for SQLAlchemy storage tests."""

import pytest
from roborean_spec import project_from_dict
from roborean_storage_sqlalchemy import (
    make_engine,
    make_session_factory,
    upgrade,
)


@pytest.fixture
def session_factory(tmp_path):
    """Return a session factory over a temporary SQLite database."""
    url = f"sqlite+pysqlite:///{tmp_path / 'test.db'}"
    engine = make_engine(url)
    upgrade(engine)
    return make_session_factory(engine)


@pytest.fixture
def minimal_project():
    """Return a tiny valid project model."""
    return project_from_dict(
        {
            "schemaVersion": "1.0.0",
            "id": "example.minimal",
            "name": "Minimal",
            "pluginRequirements": [],
            "workspace": {"variables": []},
            "bits": [],
            "documents": [],
            "templates": [],
            "metadata": {},
        }
    )
