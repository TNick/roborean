"""Secret redaction tests."""

import json
from pathlib import Path

from starlette.testclient import TestClient

from roborean_api_fastapi.redaction import assert_no_backend_only_literals


def test_backend_only_redacted(api_client: TestClient) -> None:
    """Secret fixtures never expose raw literals."""
    root = Path(__file__).resolve().parents[4]
    path = root / "conformance" / "projects" / "04_secret_ref.json"
    body = {"project": json.loads(path.read_text(encoding="utf-8"))}
    api_client.post("/v1/projects", json=body)
    project_id = body["project"]["id"]
    response = api_client.get(f"/v1/projects/{project_id}")
    payload = response.json()
    assert_no_backend_only_literals(payload)
