"""Idempotency header behavior."""

from starlette.testclient import TestClient


def test_idempotent_run_replay(
    api_client: TestClient, set_and_copy_body: dict
) -> None:
    """Same key returns the same run."""
    api_client.post("/v1/projects", json=set_and_copy_body)
    project_id = set_and_copy_body["project"]["id"]
    headers = {"Idempotency-Key": "idem-abc"}
    first = api_client.post(
        f"/v1/projects/{project_id}/runs",
        headers=headers,
        json={},
    )
    second = api_client.post(
        f"/v1/projects/{project_id}/runs",
        headers=headers,
        json={},
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["runId"] == second.json()["runId"]
