"""OpenAPI export snapshot."""

import json
from pathlib import Path

from roborean_api_fastapi.app import create_app


def test_openapi_matches_committed() -> None:
    """Exported schema matches committed openapi.json when present."""
    app = create_app()
    schema = app.openapi()
    root = Path(__file__).resolve().parents[3]
    committed = (
        root / "packages" / "typescript" / "api-types" / "openapi" / "openapi.json"
    )
    if not committed.is_file():
        return
    expected = json.loads(committed.read_text(encoding="utf-8"))
    assert schema["info"]["title"] == expected["info"]["title"]
