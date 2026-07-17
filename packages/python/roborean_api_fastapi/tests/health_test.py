"""Health endpoint tests."""

from starlette.testclient import TestClient


def test_health(api_client: TestClient) -> None:
    """Health returns engine version."""
    response = api_client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "engineVersion" in payload
