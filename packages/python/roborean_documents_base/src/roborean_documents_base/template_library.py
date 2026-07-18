"""Static template library bundled with roborean_documents_base."""

from __future__ import annotations

import base64
import json
import logging
from importlib import resources
from typing import Any, Literal

logger = logging.getLogger(__name__)

LibraryKind = Literal["document", "starter", "recipe"]


class LibraryNotFoundError(LookupError):
    """Raised when a catalog entry or asset path is missing."""


def _library_root() -> resources.abc.Traversable:
    """Return the package resource root for library assets.

    Returns:
        Traversable path to the ``library`` directory.
    """
    return resources.files("roborean_documents_base") / "library"


def _read_json(relative_path: str) -> dict[str, Any]:
    """Load one JSON file from the library package.

    Args:
        relative_path: Path relative to the library root.

    Returns:
        Parsed JSON object.

    Raises:
        LibraryNotFoundError: When the file is missing.
    """
    path = _library_root() / relative_path
    if not path.is_file():
        raise LibraryNotFoundError(relative_path)
    return json.loads(path.read_text(encoding="utf-8"))


def _read_bytes(relative_path: str) -> bytes:
    """Load one binary asset from the library package.

    Args:
        relative_path: Path relative to the library root.

    Returns:
        Raw file bytes.

    Raises:
        LibraryNotFoundError: When the file is missing.
    """
    path = _library_root() / relative_path
    if not path.is_file():
        raise LibraryNotFoundError(relative_path)
    return path.read_bytes()


def load_index() -> dict[str, Any]:
    """Load the catalog index shipped with the package.

    Returns:
        Parsed ``index.json`` document.
    """
    return _read_json("index.json")


def _entry_matches_filters(
    entry: dict[str, Any],
    *,
    kind: str | None,
    document_type: str | None,
    tag: str | None,
) -> bool:
    """Return whether one catalog entry satisfies optional filters.

    Args:
        entry: Catalog entry from ``index.json``.
        kind: Optional kind filter.
        document_type: Optional document type filter.
        tag: Optional tag filter.

    Returns:
        True when the entry should be included in list results.
    """
    if kind is not None and entry.get("kind") != kind:
        return False
    if document_type is not None and entry.get("documentType") != document_type:
        return False
    if tag is not None:
        tags = entry.get("tags")
        if not isinstance(tags, list) or tag not in tags:
            return False
    return True


def list_entries(
    *,
    kind: str | None = None,
    document_type: str | None = None,
    tag: str | None = None,
) -> list[dict[str, Any]]:
    """List catalog entries with optional filters.

    Args:
        kind: Optional entry kind filter.
        document_type: Optional document type filter for document entries.
        tag: Optional tag filter.

    Returns:
        Summary rows for matching catalog entries.
    """
    index = load_index()
    entries = index.get("entries", [])
    if not isinstance(entries, list):
        logger.debug("library index entries is not a list")
        return []
    return [
        entry
        for entry in entries
        if isinstance(entry, dict)
        and _entry_matches_filters(
            entry,
            kind=kind,
            document_type=document_type,
            tag=tag,
        )
    ]


def get_entry(entry_id: str) -> dict[str, Any]:
    """Resolve one catalog entry by id.

    Args:
        entry_id: Catalog entry identifier.

    Returns:
        Summary row from the index.

    Raises:
        LibraryNotFoundError: When the entry id is unknown.
    """
    for entry in list_entries():
        if entry.get("id") == entry_id:
            return dict(entry)
    raise LibraryNotFoundError(entry_id)


def get_entry_detail(entry_id: str) -> dict[str, Any]:
    """Load a catalog entry plus its payload body.

    Args:
        entry_id: Catalog entry identifier.

    Returns:
        Entry summary with ``manifest``, ``project``, or ``recipe`` payload.

    Raises:
        LibraryNotFoundError: When the entry or payload is missing.
    """
    entry = get_entry(entry_id)
    kind = entry.get("kind")
    detail = dict(entry)

    if kind == "document":
        manifest_path = entry.get("manifestPath")
        if isinstance(manifest_path, str):
            detail["manifest"] = _read_json(manifest_path)
        return detail

    if kind == "starter":
        starter_path = entry.get("starterPath")
        if not isinstance(starter_path, str):
            raise LibraryNotFoundError(entry_id)
        detail["project"] = _read_json(starter_path)
        return detail

    if kind == "recipe":
        recipe_path = entry.get("recipePath")
        if not isinstance(recipe_path, str):
            raise LibraryNotFoundError(entry_id)
        detail["recipe"] = _read_json(recipe_path)
        return detail

    raise LibraryNotFoundError(entry_id)


def get_document_content(entry_id: str) -> tuple[str, bytes]:
    """Load template bytes for a document catalog entry.

    Args:
        entry_id: Document catalog entry identifier.

    Returns:
        Tuple of relative path and raw template bytes.

    Raises:
        LibraryNotFoundError: When the entry is missing or not a document.
        ValueError: When the entry lacks a content path.
    """
    entry = get_entry(entry_id)
    if entry.get("kind") != "document":
        raise ValueError(f"Entry {entry_id!r} is not a document template")
    relative_path = entry.get("path")
    if not isinstance(relative_path, str) or not relative_path:
        raise ValueError(f"Entry {entry_id!r} has no content path")
    return relative_path, _read_bytes(relative_path)


def get_document_content_response(entry_id: str) -> dict[str, Any]:
    """Build a template content response for one document entry.

    Args:
        entry_id: Document catalog entry identifier.

    Returns:
        Mapping compatible with ``TemplateContentResponse``.
    """
    relative_path, data = get_document_content(entry_id)
    text: str | None = None
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = None
    return {
        "templateId": entry_id,
        "path": relative_path,
        "contentBase64": base64.b64encode(data).decode("ascii"),
        "text": text,
    }
