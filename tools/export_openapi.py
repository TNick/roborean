"""Export OpenAPI schema for TypeScript clients."""

import json
from pathlib import Path

from roborean_api_fastapi import create_app

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    """Write openapi.json into api-types package."""
    app = create_app()
    schema = app.openapi()
    out = (
        ROOT
        / "packages"
        / "typescript"
        / "api-types"
        / "openapi"
        / "openapi.json"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print("Wrote", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
