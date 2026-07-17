"""Artifact download."""

from fastapi import APIRouter, Depends, Response
from roborean_storage_base import NotFoundError

from ..deps import AppState, get_principal, get_state
from ..errors import ApiError
from ..security import Principal

router = APIRouter(prefix="/v1/runs", tags=["artifacts"])


@router.get("/{run_id}/artifacts/{artifact_id}")
def download_artifact(
    run_id: str,
    artifact_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> Response:
    """Stream one stored artifact (document id)."""
    record = state.run_service.get(run_id)
    media_type = "application/octet-stream"
    for item in record.results.artifacts if record.results else []:
        doc_id = (
            item.get("documentId")
            if isinstance(item, dict)
            else item.document_id
        )
        if doc_id == artifact_id:
            media_type = (
                item.get("mediaType")
                if isinstance(item, dict)
                else item.media_type
            )
            break
    key = f"{run_id}/{artifact_id}"
    try:
        payload = state.artifacts.get_bytes(key)
    except (NotFoundError, FileNotFoundError, KeyError) as error:
        raise ApiError(
            status_code=404,
            code="E_NOT_FOUND",
            message=f"artifact not found: {artifact_id}",
        ) from error
    return Response(content=payload, media_type=media_type)
