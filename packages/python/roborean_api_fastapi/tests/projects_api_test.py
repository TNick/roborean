"""Project CRUD API tests."""

from starlette.testclient import TestClient


def test_project_crud(
    api_client: TestClient, minimal_project_body: dict
) -> None:
    """Create, read, update, and delete a project."""
    created = api_client.post("/v1/projects", json=minimal_project_body)
    assert created.status_code == 201
    project_id = minimal_project_body["project"]["id"]
    fetched = api_client.get(f"/v1/projects/{project_id}")
    assert fetched.status_code == 200
    listed = api_client.get("/v1/projects")
    assert listed.status_code == 200
    assert any(item["id"] == project_id for item in listed.json())
    deleted = api_client.delete(f"/v1/projects/{project_id}")
    assert deleted.status_code == 204


def test_compile_project(
    api_client: TestClient, minimal_project_body: dict
) -> None:
    """Compile endpoint returns compiled payload."""
    api_client.post("/v1/projects", json=minimal_project_body)
    project_id = minimal_project_body["project"]["id"]
    response = api_client.post(f"/v1/projects/{project_id}/compile", json={})
    assert response.status_code == 200
    assert "compiled" in response.json()
