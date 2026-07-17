"""Run API tests."""

from starlette.testclient import TestClient


def test_create_run(
    api_client: TestClient, set_and_copy_body: dict
) -> None:
    """POST run persists results."""
    api_client.post("/v1/projects", json=set_and_copy_body)
    project_id = set_and_copy_body["project"]["id"]
    response = api_client.post(
        f"/v1/projects/{project_id}/runs",
        headers={"Idempotency-Key": "test-run-1"},
        json={"dryRun": False, "stopOnBitError": True},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["status"] in ("succeeded", "failed")
    assert payload.get("results") is not None
