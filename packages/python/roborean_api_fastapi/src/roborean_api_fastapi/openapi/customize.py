"""OpenAPI post-processing."""

from typing import Any


def customize_openapi(schema: dict[str, Any]) -> dict[str, Any]:
    """Apply stable metadata for generated clients.

    Args:
        schema: OpenAPI document produced by FastAPI.

    Returns:
        The same schema dict with title and version defaults filled in.
    """
    # Ensure info exists and carries stable client-facing metadata.
    info = schema.setdefault("info", {})
    info["title"] = info.get("title") or "Roborean API"
    info["version"] = info.get("version") or "0.4.0"
    return schema
