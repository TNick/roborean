"""Global template library routes."""

from functools import lru_cache

from fastapi import APIRouter, Depends, Query
from roborean_documents_base.template_library import (
    LibraryNotFoundError,
    get_document_content_response,
    get_entry_detail,
    list_entries,
)
from roborean_engine.bits.registry import builtin_registry

from ..deps import get_principal
from ..errors import ApiError
from ..schemas.template_library import (
    TemplateLibraryContentResponse,
    TemplateLibraryDetail,
    TemplateLibraryEntry,
)
from ..security import Principal

router = APIRouter(prefix="/v1/template-library", tags=["template-library"])

_SUMMARY_KEYS = {
    "id",
    "kind",
    "title",
    "description",
    "documentType",
    "driver",
    "irFamily",
    "tags",
    "templateVersion",
    "requiredInputs",
    "capabilities",
    "path",
    "mediaType",
    "variableCount",
    "bitCount",
    "documentCount",
}


@lru_cache(maxsize=1)
def _bit_type_names() -> dict[str, str]:
    """Load human-readable bit type names from the built-in registry.

    Returns:
        Mapping of bit type id to display name.
    """
    registry = builtin_registry()
    return {
        type_id: manifest.name for type_id, manifest in registry.iter_types()
    }


def _bit_type_name(type_id: str) -> str:
    """Resolve a display name for one bit type id.

    Args:
        type_id: Bit type identifier.

    Returns:
        Manifest name or a derived fallback label.
    """
    names = _bit_type_names()
    if type_id in names:
        return names[type_id]
    tail = type_id.split(".")[-1]
    return " ".join(part.capitalize() for part in tail.split("_"))


def _required_bit_type_rows(raw: dict) -> list[dict[str, str]]:
    """Expand index required bit type ids into API summary rows.

    Args:
        raw: Raw index entry dictionary.

    Returns:
        Required bit type rows with ids and display names.
    """
    rows = raw.get("requiredBitTypes")
    if not isinstance(rows, list):
        return []
    return [
        {"typeId": type_id, "name": _bit_type_name(type_id)}
        for type_id in rows
        if isinstance(type_id, str)
    ]


def _public_summary(raw: dict) -> dict:
    """Drop package-internal index keys from a catalog summary row.

    Args:
        raw: Raw index entry dictionary.

    Returns:
        Summary fields exposed by the HTTP API.
    """
    return {key: raw[key] for key in _SUMMARY_KEYS if key in raw}


def _entry_payload(raw: dict) -> dict:
    """Build the public API payload for one catalog entry.

    Args:
        raw: Raw index entry dictionary.

    Returns:
        Summary fields ready for ``TemplateLibraryEntry`` validation.
    """
    summary = _public_summary(raw)
    summary["requiredBitTypes"] = _required_bit_type_rows(raw)
    return summary


def _map_entry(raw: dict) -> TemplateLibraryEntry:
    """Convert an index row into an API DTO.

    Args:
        raw: Raw index entry dictionary.

    Returns:
        Validated summary DTO.
    """
    return TemplateLibraryEntry.model_validate(_entry_payload(raw))


@router.get("", response_model=list[TemplateLibraryEntry])
def list_template_library(
    kind: str | None = Query(default=None),
    document_type: str | None = Query(default=None, alias="documentType"),
    tag: str | None = Query(default=None),
    _principal: Principal = Depends(get_principal),
) -> list[TemplateLibraryEntry]:
    """List catalog entries with optional filters.

    Args:
        kind: Optional entry kind filter.
        document_type: Optional document type filter.
        tag: Optional tag filter.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Matching catalog summary rows.
    """
    rows = list_entries(
        kind=kind,
        document_type=document_type,
        tag=tag,
    )
    return [_map_entry(row) for row in rows]


@router.get("/{entry_id}", response_model=TemplateLibraryDetail)
def get_template_library_entry(
    entry_id: str,
    _principal: Principal = Depends(get_principal),
) -> TemplateLibraryDetail:
    """Fetch one catalog entry with its payload body.

    Args:
        entry_id: Catalog entry identifier.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Entry summary plus manifest, project, or recipe payload.

    Raises:
        ApiError: When the entry id is unknown.
    """
    try:
        detail = get_entry_detail(entry_id)
    except LibraryNotFoundError as error:
        raise ApiError(
            status_code=404,
            code="template_library.not_found",
            message=f"Template library entry not found: {entry_id}",
        ) from error
    public = _entry_payload(detail)
    if "manifest" in detail:
        public["manifest"] = detail["manifest"]
    if "project" in detail:
        public["project"] = detail["project"]
    if "recipe" in detail:
        public["recipe"] = detail["recipe"]
    return TemplateLibraryDetail.model_validate(public)


@router.get(
    "/{entry_id}/content",
    response_model=TemplateLibraryContentResponse,
)
def get_template_library_content(
    entry_id: str,
    _principal: Principal = Depends(get_principal),
) -> TemplateLibraryContentResponse:
    """Return template bytes for a document catalog entry.

    Args:
        entry_id: Document catalog entry identifier.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Base64-encoded template bytes plus a UTF-8 hint when applicable.

    Raises:
        ApiError: When the entry is missing or not a document template.
    """
    try:
        payload = get_document_content_response(entry_id)
    except LibraryNotFoundError as error:
        raise ApiError(
            status_code=404,
            code="template_library.not_found",
            message=f"Template library entry not found: {entry_id}",
        ) from error
    except ValueError as error:
        raise ApiError(
            status_code=400,
            code="template_library.invalid_entry",
            message=str(error),
        ) from error
    return TemplateLibraryContentResponse.model_validate(payload)
