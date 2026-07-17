"""API test fixtures."""

from pathlib import Path

import pytest
from starlette.testclient import TestClient

from roborean_api_fastapi.app import create_app
from roborean_api_fastapi.deps import reset_state
from roborean_api_fastapi.settings import Settings


@pytest.fixture(autouse=True)
def _reset_app_state() -> None:
    """Isolate tests."""
    reset_state()
    yield
    reset_state()


@pytest.fixture
def api_client(tmp_path: Path):
    """HTTP client backed by a dict store under tmp_path."""
    settings = Settings(
        storage_backend="dict",
        store_path=tmp_path / "store",
        artifact_root=tmp_path / "artifacts",
    )
    app = create_app(settings)
    with TestClient(app) as client:
        yield client


@pytest.fixture
def minimal_project_body() -> dict:
    """Phase 1 minimal project JSON."""
    root = Path(__file__).resolve().parents[4]
    path = root / "conformance" / "projects" / "01_minimal.json"
    import json

    return {"project": json.loads(path.read_text(encoding="utf-8"))}


@pytest.fixture
def set_and_copy_body() -> dict:
    """Load set-and-copy fixture."""
    root = Path(__file__).resolve().parents[4]
    path = root / "conformance" / "projects" / "02_set_and_copy.json"
    import json

    return {"project": json.loads(path.read_text(encoding="utf-8"))}
