"""HTTP error mapping."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from roborean_engine.compiler import CompileError
from roborean_storage_base import ConflictError, NotFoundError

from .schemas.common import DiagnosticDto, ErrorBody


class ApiError(Exception):
    """Structured API failure.

    Attributes:
        status_code: HTTP status code to return to the client.
        code: Stable machine-readable error code.
        message: Human-readable failure description.
        diagnostics: Optional compile or validation diagnostics.
    """

    status_code: int
    code: str
    message: str
    diagnostics: list[DiagnosticDto]

    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        diagnostics: list[DiagnosticDto] | None = None,
    ) -> None:
        """Store HTTP metadata for exception handlers.

        Args:
            status_code: HTTP status code to return to the client.
            code: Stable machine-readable error code.
            message: Human-readable failure description.
            diagnostics: Optional compile or validation diagnostics.
        """
        self.status_code = status_code
        self.code = code
        self.message = message
        self.diagnostics = diagnostics or []
        super().__init__(message)


def install_exception_handlers(app: FastAPI) -> None:
    """Register domain → HTTP mappings.

    Args:
        app: FastAPI application that receives the handlers.
    """

    @app.exception_handler(ApiError)
    async def _api_error(_request: Request, error: ApiError) -> JSONResponse:
        """Map ``ApiError`` to a JSON error body.

        Args:
            _request: Unused request (required by FastAPI).
            error: Raised API error with status and diagnostics.

        Returns:
            JSON response with the structured error body.
        """
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
        """Map storage not-found errors to HTTP 404.

        Args:
            _request: Unused request (required by FastAPI).
            error: Raised not-found domain error.

        Returns:
            JSON response with status 404.
        """
        body = ErrorBody(code="E_NOT_FOUND", message=str(error))
        return JSONResponse(
            status_code=404, content=body.model_dump(by_alias=True)
        )

    @app.exception_handler(ConflictError)
    async def _conflict(
        _request: Request, error: ConflictError
    ) -> JSONResponse:
        """Map storage conflict errors to HTTP 409.

        Args:
            _request: Unused request (required by FastAPI).
            error: Raised conflict domain error.

        Returns:
            JSON response with status 409.
        """
        body = ErrorBody(code="E_CONFLICT", message=str(error))
        return JSONResponse(
            status_code=409, content=body.model_dump(by_alias=True)
        )

    @app.exception_handler(CompileError)
    async def _compile(_request: Request, error: CompileError) -> JSONResponse:
        """Map compile failures to HTTP 400 with diagnostics.

        Args:
            _request: Unused request (required by FastAPI).
            error: Raised compile error with diagnostics.

        Returns:
            JSON response with status 400 and diagnostic list.
        """
        # Convert engine diagnostics into API DTOs.
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
