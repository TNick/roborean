"""Template library package tests."""

from roborean_documents_base.template_library import (
    get_document_content_response,
    get_entry_detail,
    list_entries,
)


def test_list_entries_includes_documents() -> None:
    """Index lists seeded document templates."""
    rows = list_entries(kind="document")
    ids = {row["id"] for row in rows}
    assert "hello" in ids


def test_get_starter_detail() -> None:
    """Starter detail includes a project payload."""
    detail = get_entry_detail("blank-workspace")
    assert detail["kind"] == "starter"
    assert detail["project"]["bits"] == []


def test_get_document_content() -> None:
    """Document content loader returns UTF-8 text for hello."""
    payload = get_document_content_response("hello")
    assert payload["text"] is not None
    assert "{{name}}" in payload["text"]
