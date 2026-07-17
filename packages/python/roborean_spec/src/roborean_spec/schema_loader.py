"""Load and validate canonical Roborean JSON Schemas."""

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker, RefResolver


def find_repo_root() -> Path:
    """Find the repository root containing the project schema.

    Returns:
        Absolute path to the repository root.

    Raises:
        FileNotFoundError: When ``schemas/project.schema.json`` is not found.
    """
    # Walk from this installed source location toward a repository checkout.
    for parent in Path(__file__).resolve().parents:
        if (parent / "schemas" / "project.schema.json").is_file():
            return parent

    raise FileNotFoundError("Could not find schemas/project.schema.json")


def schema_dir() -> Path:
    """Return the canonical schema directory.

    Returns:
        Absolute path to the repository ``schemas/`` directory.
    """
    return find_repo_root() / "schemas"


def load_schema(name: str) -> dict[str, Any]:
    """Load one canonical schema by logical name.

    Args:
        name: Logical schema name or relative path under ``schemas/``.

    Returns:
        Parsed JSON Schema document as a dictionary.
    """
    # Preserve meta paths while adding the standard schema suffix elsewhere.
    relative = Path(name)
    filename = relative.name
    if not filename.endswith(".json"):
        filename = f"{filename}.schema.json"
    return json.loads((schema_dir() / relative.parent / filename).read_text())


def validate_instance(schema_name: str, data: dict[str, Any]) -> None:
    """Validate data using its schema and every local schema as a ref store.

    Args:
        schema_name: Logical schema name passed to ``load_schema``.
        data: JSON-compatible instance to validate.

    Raises:
        jsonschema.ValidationError: When ``data`` does not match the schema.
    """
    # Build a resolver store so relative schema references work consistently.
    directory = schema_dir()
    store: dict[str, Any] = {}
    for path in directory.rglob("*.json"):
        schema = json.loads(path.read_text())
        schema_id = schema.get("$id")
        if schema_id:
            store[schema_id] = schema

    schema = load_schema(schema_name)
    resolver = RefResolver.from_schema(schema, store=store)
    validator = Draft202012Validator(
        schema,
        resolver=resolver,
        format_checker=FormatChecker(),
    )

    # Raise jsonschema's standard, information-rich validation exception.
    validator.validate(data)
