"""OpenAPI post-processing."""

from typing import Any


def customize_openapi(schema: dict[str, Any]) -> dict[str, Any]:
    """Apply stable metadata for generated clients."""
    info = schema.setdefault("info", {})
    info["title"] = info.get("title") or "Roborean API"
    info["version"] = info.get("version") or "0.4.0"
    return schema
