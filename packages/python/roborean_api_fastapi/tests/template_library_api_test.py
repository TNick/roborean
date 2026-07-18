"""Template library API tests."""

from starlette.testclient import TestClient


def test_list_template_library(api_client: TestClient) -> None:
    """Catalog list returns document, starter, and recipe entries."""
    response = api_client.get("/v1/template-library")
    assert response.status_code == 200
    rows = response.json()
    kinds = {row["kind"] for row in rows}
    assert {"document", "starter", "recipe"}.issubset(kinds)


def test_filter_template_library_by_kind(api_client: TestClient) -> None:
    """Kind filter narrows catalog results."""
    response = api_client.get("/v1/template-library", params={"kind": "recipe"})
    assert response.status_code == 200
    rows = response.json()
    assert rows
    assert all(row["kind"] == "recipe" for row in rows)


def test_get_template_library_entry(api_client: TestClient) -> None:
    """Detail endpoint returns starter project payload."""
    response = api_client.get("/v1/template-library/set-and-copy")
    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "starter"
    assert body["project"]["name"] == "Set and copy"
    assert len(body["project"]["documents"]) == 3
    assert body["documentCount"] == 3
    assert body["bitCount"] == 11


def test_recipe_required_bit_types_include_names(
    api_client: TestClient,
) -> None:
    """Recipe entries expose required bit types with display names."""
    response = api_client.get("/v1/template-library/set-and-copy-title")
    assert response.status_code == 200
    body = response.json()
    assert body["kind"] == "recipe"
    required = body["requiredBitTypes"]
    assert required
    assert required[0]["typeId"] == "roborean.set_variable"
    assert required[0]["name"] == "Set variable"


def test_get_template_library_content(api_client: TestClient) -> None:
    """Document content endpoint returns hello template bytes."""
    response = api_client.get("/v1/template-library/hello/content")
    assert response.status_code == 200
    body = response.json()
    assert body["templateId"] == "hello"
    assert "Hello" in (body.get("text") or "")


def test_get_title_template_library_content(api_client: TestClient) -> None:
    """Document content endpoint returns title template bytes."""
    response = api_client.get("/v1/template-library/title/content")
    assert response.status_code == 200
    body = response.json()
    assert body["templateId"] == "title"
    assert "{{title}}" in (body.get("text") or "")


def test_get_template_library_missing(api_client: TestClient) -> None:
    """Unknown entry ids return 404."""
    response = api_client.get("/v1/template-library/missing-entry")
    assert response.status_code == 404
