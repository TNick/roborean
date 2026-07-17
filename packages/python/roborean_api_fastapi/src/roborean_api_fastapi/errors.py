"""HTTP error mapping."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from roborean_engine.compiler import CompileError
from roborean_storage_base import ConflictError, NotFoundError

from .schemas.common import DiagnosticDto, ErrorBody


class ApiError(Exception):
    """Structured API failure."""

    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        diagnostics: list[DiagnosticDto] | None = None,
    ) -> None:
        """Store HTTP metadata for handlers."""
        self.status_code = status_code
        self.code = code
        self.message = message
        self.diagnostics = diagnostics or []
        super().__init__(message)


def install_exception_handlers(app: FastAPI) -> None:
    """Register domain → HTTP mappings."""

    @app.exception_handler(ApiError)
    async def _api_error(_request: Request, error: ApiError) -> JSONResponse:
        body = ErrorBody(
            code=error.code,
            message=error.message,
            diagnostics=error.diagnostics,
        )
        return JSONResponse(
            status_code=error.status_code,
            content=body.model_dump(mode="json", by_alias=True),
        )

    @app.exception_handler(NotFoundError)
    async def _not_found(
        _request: Request, error: NotFoundError
    ) -> JSONResponse:
        body = ErrorBody(code="E_NOT_FOUND", message=str(error))
        return JSONResponse(
            status_code=404, content=body.model_dump(by_alias=True)
        )

    @app.exception_handler(ConflictError)
    async def _conflict(
        _request: Request, error: ConflictError
    ) -> JSONResponse:
        body = ErrorBody(code="E_CONFLICT", message=str(error))
        return JSONResponse(
            status_code=409, content=body.model_dump(by_alias=True)
        )

    @app.exception_handler(CompileError)
    async def _compile(_request: Request, error: CompileError) -> JSONResponse:
        diagnostics = [
            DiagnosticDto(
                severity=item.severity,
                code=item.code,
                message=item.message,
                path=item.path,
            )
            for item in error.diagnostics
        ]
        body = ErrorBody(
            code="E_COMPILE",
            message=str(error),
            diagnostics=diagnostics,
        )
        return JSONResponse(
            status_code=400, content=body.model_dump(by_alias=True)
        )
