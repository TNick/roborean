"""Verify canonical schemas stay aligned with Python and TypeScript bindings."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from jsonschema import (  # noqa: E402
    ValidationError as JsonSchemaValidationError,
)
from pydantic import BaseModel  # noqa: E402
from schema_bindings import (  # noqa: E402
    PYDANTIC_FIXTURES,
    SCHEMA_BINDINGS,
    SCHEMA_ONLY_RELPATHS,
)

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS_DIR = ROOT / "schemas"
EMBED_SCRIPT = ROOT / "packages/typescript/spec/scripts/embed-schemas.mjs"
EMBEDDED_TS = ROOT / "packages/typescript/spec/src/embedded_schemas.ts"
ZOD_TS = ROOT / "packages/typescript/spec/src/zod/index.ts"


def _schema_files() -> list[Path]:
    """Collect canonical JSON Schema documents (not example instances)."""
    paths = sorted(SCHEMAS_DIR.rglob("*.schema.json"))
    meta = SCHEMAS_DIR / "meta" / "schema-version.json"
    if meta.is_file() and meta not in paths:
        paths.append(meta)
    return paths


def check_schema_ids() -> list[str]:
    """Ensure every schema file declares a unique ``$id``."""
    errors: list[str] = []
    seen_ids: dict[str, Path] = {}

    for path in _schema_files():
        data = json.loads(path.read_text(encoding="utf-8"))
        rel = path.relative_to(ROOT)
        schema_id = data.get("$id")
        if not schema_id:
            errors.append(f"missing $id: {rel}")
            continue
        previous = seen_ids.get(schema_id)
        if previous is not None:
            errors.append(f"duplicate $id {schema_id!r}: {previous} and {rel}")
        seen_ids[schema_id] = rel

    return errors


def _load_embed_names() -> list[str]:
    """Read the embed script manifest of bundled schema keys."""
    text = EMBED_SCRIPT.read_text(encoding="utf-8")
    match = re.search(r"const NAMES = \[(.*?)\];", text, re.DOTALL)
    if not match:
        raise RuntimeError("Could not parse NAMES from embed-schemas.mjs")
    block = match.group(1)
    return re.findall(r'"([^"]+)"', block)


def _load_embedded_schemas() -> dict[str, dict[str, Any]]:
    """Parse generated ``embedded_schemas.ts`` into logical key → document."""
    embedded: dict[str, dict[str, Any]] = {}
    for line in EMBEDDED_TS.read_text(encoding="utf-8").splitlines():
        match = re.match(
            r'\s+"([^"]+)":\s*(\{.*\})\s*as Record<string, unknown>,\s*$',
            line,
        )
        if not match:
            continue
        embedded[match.group(1)] = json.loads(match.group(2))
    return embedded


def check_embedded_schemas() -> list[str]:
    """Ensure embedded TS copies match ``schemas/`` and the embed manifest."""
    errors: list[str] = []
    names = _load_embed_names()
    embedded = _load_embedded_schemas()

    if set(names) != set(embedded):
        errors.append(
            "embed-schemas.mjs NAMES and embedded_schemas.ts keys differ: "
            f"names={sorted(names)}, embedded={sorted(embedded)}"
        )

    for name in names:
        disk_path = SCHEMAS_DIR / f"{name}.schema.json"
        if not disk_path.is_file():
            errors.append(f"embed manifest references missing schema: {name}")
            continue
        disk_doc = json.loads(disk_path.read_text(encoding="utf-8"))
        ts_doc = embedded.get(name)
        if ts_doc is None:
            errors.append(f"embedded_schemas.ts missing key {name!r}")
            continue
        if disk_doc != ts_doc:
            errors.append(
                f"embedded drift for {name}: run "
                "node packages/typescript/spec/scripts/embed-schemas.mjs"
            )

    expected_embed_keys = {
        binding.embed_key
        for binding in SCHEMA_BINDINGS
        if binding.embed_key is not None
    }
    if set(names) != expected_embed_keys:
        errors.append(
            "SCHEMA_BINDINGS embed_key set does not match embed-schemas.mjs: "
            f"bindings={sorted(expected_embed_keys)}, script={sorted(names)}"
        )

    return errors


def _load_zod_exports() -> set[str]:
    """Collect exported Zod schema constant names from the spec package."""
    text = ZOD_TS.read_text(encoding="utf-8")
    return set(re.findall(r"export const (\w+)(?::|\s*=)", text))


def check_zod_bindings() -> list[str]:
    """Verify declared Zod exports exist and cover the binding registry."""
    errors: list[str] = []
    exports = _load_zod_exports()
    declared = {
        binding.zod_export
        for binding in SCHEMA_BINDINGS
        if binding.zod_export is not None
    }
    missing = declared - exports
    if missing:
        errors.append(f"missing Zod exports in zod/index.ts: {sorted(missing)}")

    workspace_export = "workspaceValueSchema"
    if workspace_export not in exports:
        errors.append(f"missing required Zod export {workspace_export!r}")

    return errors


def _model_json_keys(model: type[BaseModel]) -> set[str]:
    """Return JSON property names produced by a Pydantic model."""
    keys: set[str] = set()
    for name, field in model.model_fields.items():
        alias = field.alias if field.alias is not None else name
        keys.add(alias)
    return keys


def _check_pydantic_top_level(
    model: type[BaseModel],
    schema: dict[str, Any],
) -> list[str]:
    """Compare top-level object ``required``/``properties`` to a model."""
    errors: list[str] = []
    if schema.get("type") != "object":
        return errors

    properties = schema.get("properties", {})
    required = set(schema.get("required", []))
    model_keys = _model_json_keys(model)

    for key in required:
        if key not in model_keys:
            errors.append(
                f"{model.__name__} missing required schema property {key!r}"
            )

    if schema.get("additionalProperties") is False:
        extras = model_keys - set(properties.keys())
        if extras:
            errors.append(
                f"{model.__name__} has properties not in schema: "
                f"{sorted(extras)}"
            )

    return errors


def check_pydantic_bindings() -> list[str]:
    """Ensure registry models exist and match schema top-level shapes."""
    import roborean_spec.models as models_module

    errors: list[str] = []
    bound_paths = {binding.relpath for binding in SCHEMA_BINDINGS}

    for path in _schema_files():
        rel = str(path.relative_to(SCHEMAS_DIR)).replace("\\", "/")
        if rel in SCHEMA_ONLY_RELPATHS:
            continue
        if rel not in bound_paths:
            errors.append(f"no SCHEMA_BINDINGS entry for schemas/{rel}")

    for binding in SCHEMA_BINDINGS:
        if binding.pydantic_model is None:
            continue
        model = getattr(models_module, binding.pydantic_model, None)
        if model is None:
            errors.append(
                f"unknown pydantic model {binding.pydantic_model!r} "
                f"for {binding.relpath}"
            )
            continue
        schema_path = SCHEMAS_DIR / binding.relpath
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        if binding.check_top_level:
            errors.extend(_check_pydantic_top_level(model, schema))

    return errors


def check_pydantic_fixture_parity() -> list[str]:
    """Validate golden fixtures with jsonschema and Pydantic together."""
    import roborean_spec.models as models_module
    from pydantic import ValidationError as PydanticValidationError
    from roborean_spec.schema_loader import validate_instance

    errors: list[str] = []

    for schema_name, fixture_relpath, model_name in PYDANTIC_FIXTURES:
        fixture_path = ROOT / fixture_relpath
        if not fixture_path.is_file():
            errors.append(f"missing conformance fixture: {fixture_relpath}")
            continue
        payload = json.loads(fixture_path.read_text(encoding="utf-8"))
        if schema_name == "workspace-patch":
            instance = payload["patch"]
        else:
            instance = payload

        model = getattr(models_module, model_name)
        try:
            validate_instance(schema_name, instance)
            model.model_validate(instance)
        except (
            JsonSchemaValidationError,
            PydanticValidationError,
            KeyError,
            TypeError,
            ValueError,
        ) as exc:
            errors.append(
                f"fixture parity failed for {fixture_relpath} "
                f"({schema_name}/{model_name}): {exc}"
            )

    return errors


def run_checks() -> list[str]:
    """Run every schema synchronization check."""
    errors: list[str] = []
    errors.extend(check_schema_ids())
    errors.extend(check_embedded_schemas())
    errors.extend(check_zod_bindings())
    errors.extend(check_pydantic_bindings())
    errors.extend(check_pydantic_fixture_parity())
    return errors


def main() -> int:
    """Execute schema sync checks and print a concise report."""
    errors = run_checks()
    if errors:
        print("Schema sync failed:")
        for item in errors:
            print(f"  - {item}")
        return 1
    print(
        "Schema sync passed ($id, embedded TS, Zod exports, Pydantic "
        "registry, conformance fixtures)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
