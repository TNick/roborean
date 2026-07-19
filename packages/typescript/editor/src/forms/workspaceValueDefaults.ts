import type { WorkspaceValue } from "@roborean/spec";

import {
  applyPublicLiteralValueType,
  valueTypeFromSchema,
} from "./schemaConstraints.js";

/**
 * Build a default workspace value for a kind.
 *
 * @param kind - Workspace value kind.
 * @returns Minimal value object for the kind.
 */
export function defaultWorkspaceValueForKind(
  kind: WorkspaceValue["kind"],
): WorkspaceValue {
  if (kind === "public_literal") {
    return { kind, dataType: "string", value: "" };
  }
  if (kind === "secret_ref") {
    return { kind, ref: "" };
  }
  if (kind === "eq_token") {
    return { kind, token: "" };
  }
  if (kind === "shape_token") {
    return { kind, shape: "email" };
  }
  if (kind === "bucket") {
    return { kind, bucket: "" };
  }
  return { kind, reason: "unknown" };
}

/**
 * Check whether a value looks like a workspace value document.
 *
 * @param value - Candidate config value.
 * @returns True when the object has a string `kind` field.
 */
export function isWorkspaceValue(value: unknown): value is WorkspaceValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as { kind: unknown }).kind === "string"
  );
}

/**
 * Normalize bit config input into a workspace value document.
 *
 * @param value - Raw config field value.
 * @returns Workspace value suitable for editing.
 */
export function normalizeWorkspaceValue(value: unknown): WorkspaceValue {
  if (isWorkspaceValue(value)) {
    return value;
  }

  if (typeof value === "string") {
    return {
      kind: "public_literal",
      dataType: "string",
      value,
    };
  }

  return defaultWorkspaceValueForKind("public_literal");
}

/**
 * Coerce a workspace value to a public literal matching a variable schema.
 *
 * @param value - Current workspace value document.
 * @param schema - Declared variable JSON Schema.
 * @returns Public literal with the schema's value type and coerced scalar.
 */
export function bindPublicLiteralToVariableSchema(
  value: WorkspaceValue,
  schema: Record<string, unknown>,
): Extract<WorkspaceValue, { kind: "public_literal" }> {
  const valueType = valueTypeFromSchema(schema);
  const literal =
    value.kind === "public_literal"
      ? value
      : ({ kind: "public_literal", dataType: "string", value: "" } as Extract<
          WorkspaceValue,
          { kind: "public_literal" }
        >);

  return applyPublicLiteralValueType(literal, valueType, schema);
}
