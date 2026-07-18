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


def test_set_and_copy_starter_includes_document() -> None:
    """Set-and-copy starter includes previewable documents and fill bits."""
    detail = get_entry_detail("set-and-copy")
    assert detail["kind"] == "starter"
    project = detail["project"]
    assert len(project["documents"]) == 3
    document_ids = {document["id"] for document in project["documents"]}
    assert document_ids == {"title_doc", "copy_doc", "summary_doc"}
    assert any(
        bit["type"] == "roborean.replace_named_value" for bit in project["bits"]
    )


def test_starter_and_recipe_bits_have_labels() -> None:
    """Every bit in library starters and recipes has a user-facing label."""
    for row in list_entries():
        kind = row["kind"]
        if kind not in ("starter", "recipe"):
            continue
        detail = get_entry_detail(row["id"])
        if kind == "starter":
            bits = detail["project"]["bits"]
        else:
            bits = detail["recipe"]["bits"]
        for bit in bits:
            label = bit.get("label", "")
            assert isinstance(label, str) and label.strip(), bit["id"]


def test_get_document_content() -> None:
    """Document content loader returns UTF-8 text for hello."""
    payload = get_document_content_response("hello")
    assert payload["text"] is not None
    assert "{{name}}" in payload["text"]


def test_get_title_document_content() -> None:
    """Document content loader returns UTF-8 text for title."""
    payload = get_document_content_response("title")
    assert payload["text"] is not None
    assert "{{title}}" in payload["text"]
