import type { ErrorObject } from "ajv";
import type { JsonScalar, Variable, WorkspaceValue } from "@roborean/spec";
import { validateDataAgainstSchema } from "@roborean/spec";

import type { DescribedOption } from "./DescribedMenuItem.js";

/**
 * Scalar value types supported by the structured variable editor.
 */
export type ValueType = "string" | "integer" | "number" | "boolean" | "date";

/**
 * Input kind for a constraint value field in the add-constraint dialog.
 */
export type ConstraintInputKind =
  "number" | "text" | "csv-enum" | "predefined-pairs";

/** Vendor keyword for labeled predefined literal suggestions. */
export const PREDEFINED_KEY = "x-roborean-predefined";

/**
 * One predefined literal suggestion with an optional display label.
 */
export type PredefinedOption = {
  /** Stored literal value. */
  value: JsonScalar;

  /** Optional user-facing label shown in the editor. */
  label?: string;
};

/**
 * One JSON Schema constraint the user can add for a value type.
 */
export type ConstraintDefinition = {
  /** JSON Schema keyword written to `variable.schema`. */
  key: string;

  /** User-facing constraint name. */
  label: string;

  /** Help text for the constraint. */
  description: string;

  /** How the dialog collects the constraint value. */
  inputKind: ConstraintInputKind;

  /**
   * Format a stored schema value for display in the constraints list.
   *
   * @param value - Parsed schema value.
   * @returns Short display string.
   */
  formatDisplay: (value: unknown) => string;

  /**
   * Parse user input from the dialog into a schema value.
   *
   * @param input - Raw text from the value field.
   * @returns Parsed value, or null when invalid.
   */
  parseInput: (input: string) => unknown | null;
};

/**
 * One active constraint shown in the value editor list.
 */
export type ActiveConstraint = {
  /** JSON Schema keyword. */
  key: string;

  /** User-facing label. */
  label: string;

  /** Stored schema value. */
  value: unknown;

  /** Short display string for the value. */
  displayValue: string;
};

/** Value type options for the structured editor. */
export const VALUE_TYPE_OPTIONS: DescribedOption<ValueType>[] = [
  {
    value: "string",
    label: "String",
    description: "Free-form text values validated as JSON Schema strings.",
  },
  {
    value: "integer",
    label: "Integer",
    description: "Whole numbers without a fractional part.",
  },
  {
    value: "number",
    label: "Number",
    description: "Numeric values that may include decimals.",
  },
  {
    value: "boolean",
    label: "Boolean",
    description: "True or false values.",
  },
  {
    value: "date",
    label: "Date",
    description:
      "ISO date strings (YYYY-MM-DD) stored as strings with format date.",
  },
];

/**
 * JSON Schema keywords managed by the type selector rather than constraints.
 */
const TYPE_MANAGED_KEYS = new Set(["type", "format"]);

/**
 * Parse a numeric constraint input.
 *
 * @param input - Raw text from the dialog.
 * @returns Parsed number, or null when invalid.
 */
function parseNumberInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Parse a comma-separated enum for string-like types.
 *
 * @param input - Raw CSV text.
 * @returns String enum array, or null when empty.
 */
function parseStringEnumInput(input: string): string[] | null {
  const values = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (values.length === 0) {
    return null;
  }

  return values;
}

/**
 * Parse a comma-separated enum for numeric types.
 *
 * @param input - Raw CSV text.
 * @returns Numeric enum array, or null when invalid or empty.
 */
function parseNumberEnumInput(input: string): number[] | null {
  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  const values: number[] = [];
  for (const part of parts) {
    const parsed = Number(part);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    values.push(parsed);
  }

  return values;
}

/**
 * Parse a comma-separated enum for boolean values.
 *
 * @param input - Raw CSV text.
 * @returns Boolean enum array, or null when invalid or empty.
 */
function parseBooleanEnumInput(input: string): boolean[] | null {
  const parts = input
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  const values: boolean[] = [];
  for (const part of parts) {
    if (part === "true") {
      values.push(true);
      continue;
    }
    if (part === "false") {
      values.push(false);
      continue;
    }
    return null;
  }

  return values;
}

/**
 * Parse one predefined value token for a structured value type.
 *
 * @param rawValue - Raw value text from one line.
 * @param valueType - Structured value type.
 * @returns Parsed scalar, or null when invalid.
 */
function parsePredefinedScalar(
  rawValue: string,
  valueType: ValueType,
): JsonScalar | null {
  if (valueType === "boolean") {
    const lowered = rawValue.trim().toLowerCase();
    if (lowered === "true") {
      return true;
    }
    if (lowered === "false") {
      return false;
    }
    return null;
  }

  if (valueType === "integer") {
    const parsed = Number.parseInt(rawValue.trim(), 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  if (valueType === "number") {
    const parsed = Number.parseFloat(rawValue.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parse one predefined line into a suggestion option.
 *
 * @param line - One line of `value` or `value|label` text.
 * @param valueType - Structured value type.
 * @returns Parsed option, or null when the line is empty or invalid.
 */
function parsePredefinedLine(
  line: string,
  valueType: ValueType,
): PredefinedOption | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const pipeIndex = trimmed.indexOf("|");
  const rawValue =
    pipeIndex >= 0 ? trimmed.slice(0, pipeIndex).trim() : trimmed;
  const label =
    pipeIndex >= 0
      ? trimmed.slice(pipeIndex + 1).trim() || undefined
      : undefined;
  const value = parsePredefinedScalar(rawValue, valueType);
  if (value === null) {
    return null;
  }

  return label ? { value, label } : { value };
}

/**
 * Format predefined options for the constraint dialog.
 *
 * @param value - Stored predefined option array.
 * @returns Multiline text for editing.
 */
function formatPredefinedDisplay(value: unknown): string {
  if (!Array.isArray(value)) {
    return String(value);
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null || !("value" in item)) {
        return String(item);
      }

      const option = item as PredefinedOption;
      const label = option.label?.trim();
      if (label) {
        return `${String(option.value)}|${label}`;
      }
      return String(option.value);
    })
    .join("\n");
}

/**
 * Build a predefined-value parser for one structured value type.
 *
 * @param valueType - Structured value type.
 * @returns Parser for multiline predefined input.
 */
function createParsePredefinedInput(
  valueType: ValueType,
): (input: string) => PredefinedOption[] | null {
  return (input: string): PredefinedOption[] | null => {
    const options: PredefinedOption[] = [];

    for (const line of input.split("\n")) {
      const parsed = parsePredefinedLine(line, valueType);
      if (parsed) {
        options.push(parsed);
      }
    }

    if (options.length === 0) {
      return null;
    }

    return options;
  };
}

/** Shared predefined-values constraint for all scalar types. */
function predefinedConstraint(valueType: ValueType): ConstraintDefinition {
  return {
    key: PREDEFINED_KEY,
    label: "Predefined values",
    description:
      "One suggestion per line as value or value|label. Users may enter other values.",
    inputKind: "predefined-pairs",
    formatDisplay: formatPredefinedDisplay,
    parseInput: createParsePredefinedInput(valueType),
  };
}

/** Shared numeric constraint definitions for integer and number types. */
const NUMERIC_CONSTRAINTS: ConstraintDefinition[] = [
  {
    key: "minimum",
    label: "Minimum",
    description: "The smallest value allowed (inclusive).",
    inputKind: "number",
    formatDisplay: (value) => String(value),
    parseInput: parseNumberInput,
  },
  {
    key: "maximum",
    label: "Maximum",
    description: "The largest value allowed (inclusive).",
    inputKind: "number",
    formatDisplay: (value) => String(value),
    parseInput: parseNumberInput,
  },
  {
    key: "exclusiveMinimum",
    label: "Exclusive minimum",
    description: "Values must be strictly greater than this number.",
    inputKind: "number",
    formatDisplay: (value) => String(value),
    parseInput: parseNumberInput,
  },
  {
    key: "exclusiveMaximum",
    label: "Exclusive maximum",
    description: "Values must be strictly less than this number.",
    inputKind: "number",
    formatDisplay: (value) => String(value),
    parseInput: parseNumberInput,
  },
  {
    key: "multipleOf",
    label: "Multiple of",
    description: "Values must divide evenly by this number.",
    inputKind: "number",
    formatDisplay: (value) => String(value),
    parseInput: parseNumberInput,
  },
];

/**
 * Constraint catalog keyed by structured editor value type.
 */
export const CONSTRAINT_CATALOG: Record<ValueType, ConstraintDefinition[]> = {
  string: [
    {
      key: "minLength",
      label: "Minimum length",
      description: "Minimum number of characters in the string.",
      inputKind: "number",
      formatDisplay: (value) => String(value),
      parseInput: parseNumberInput,
    },
    {
      key: "maxLength",
      label: "Maximum length",
      description: "Maximum number of characters in the string.",
      inputKind: "number",
      formatDisplay: (value) => String(value),
      parseInput: parseNumberInput,
    },
    {
      key: "pattern",
      label: "Pattern",
      description: "Regular expression the string must match.",
      inputKind: "text",
      formatDisplay: (value) => String(value),
      parseInput: (input) => {
        const trimmed = input.trim();
        return trimmed.length > 0 ? trimmed : null;
      },
    },
    {
      key: "format",
      label: "Format",
      description: "JSON Schema format keyword (for example email, uri, uuid).",
      inputKind: "text",
      formatDisplay: (value) => String(value),
      parseInput: (input) => {
        const trimmed = input.trim();
        return trimmed.length > 0 ? trimmed : null;
      },
    },
    {
      key: "enum",
      label: "Allowed values",
      description: "Comma-separated list of allowed string values.",
      inputKind: "csv-enum",
      formatDisplay: (value) =>
        Array.isArray(value) ? value.map(String).join(", ") : String(value),
      parseInput: parseStringEnumInput,
    },
    predefinedConstraint("string"),
  ],
  integer: [
    ...NUMERIC_CONSTRAINTS,
    {
      key: "enum",
      label: "Allowed values",
      description: "Comma-separated list of allowed integer values.",
      inputKind: "csv-enum",
      formatDisplay: (value) =>
        Array.isArray(value) ? value.map(String).join(", ") : String(value),
      parseInput: parseNumberEnumInput,
    },
    predefinedConstraint("integer"),
  ],
  number: [
    ...NUMERIC_CONSTRAINTS,
    {
      key: "enum",
      label: "Allowed values",
      description: "Comma-separated list of allowed numeric values.",
      inputKind: "csv-enum",
      formatDisplay: (value) =>
        Array.isArray(value) ? value.map(String).join(", ") : String(value),
      parseInput: parseNumberEnumInput,
    },
    predefinedConstraint("number"),
  ],
  boolean: [
    {
      key: "enum",
      label: "Allowed values",
      description:
        "Comma-separated true/false values (for example true,false).",
      inputKind: "csv-enum",
      formatDisplay: (value) =>
        Array.isArray(value) ? value.map(String).join(", ") : String(value),
      parseInput: parseBooleanEnumInput,
    },
    predefinedConstraint("boolean"),
  ],
  date: [
    {
      key: "enum",
      label: "Allowed values",
      description: "Comma-separated list of allowed ISO date strings.",
      inputKind: "csv-enum",
      formatDisplay: (value) =>
        Array.isArray(value) ? value.map(String).join(", ") : String(value),
      parseInput: parseStringEnumInput,
    },
    predefinedConstraint("date"),
  ],
};

/**
 * Return the non-null JSON Schema type keyword from a schema object.
 *
 * @param schema - Variable JSON Schema object.
 * @returns Base type keyword, if present.
 */
export function baseSchemaType(
  schema: Record<string, unknown>,
): string | undefined {
  const schemaType = schema.type;

  if (typeof schemaType === "string") {
    return schemaType === "null" ? undefined : schemaType;
  }

  if (Array.isArray(schemaType)) {
    const nonNullTypes = schemaType.filter((entry) => entry !== "null");
    return nonNullTypes.length > 0 ? String(nonNullTypes[0]) : undefined;
  }

  return undefined;
}

/**
 * Return whether a schema allows JSON null literals.
 *
 * @param schema - Variable JSON Schema object.
 * @returns True when `type` includes `"null"`.
 */
export function schemaAllowsNull(schema: Record<string, unknown>): boolean {
  const schemaType = schema.type;

  if (schemaType === "null") {
    return true;
  }

  if (Array.isArray(schemaType)) {
    return schemaType.includes("null");
  }

  return false;
}

/**
 * Read allowed enum values from a variable schema.
 *
 * @param schema - Optional variable JSON Schema object.
 * @returns Enum array when present and non-empty.
 */
export function readSchemaEnum(
  schema?: Record<string, unknown>,
): unknown[] | undefined {
  if (!schema || !("enum" in schema)) {
    return undefined;
  }

  const enumValues = schema.enum;
  if (!Array.isArray(enumValues) || enumValues.length === 0) {
    return undefined;
  }

  return enumValues;
}

/**
 * Read predefined suggestion options from a variable schema.
 *
 * @param schema - Optional variable JSON Schema object.
 * @returns Predefined options when present and non-empty.
 */
export function readPredefinedOptions(
  schema?: Record<string, unknown>,
): PredefinedOption[] | undefined {
  if (!schema || !(PREDEFINED_KEY in schema)) {
    return undefined;
  }

  const raw = schema[PREDEFINED_KEY];
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }

  const options: PredefinedOption[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || !("value" in item)) {
      continue;
    }

    const option = item as PredefinedOption;
    options.push(
      option.label
        ? { value: option.value, label: option.label }
        : { value: option.value },
    );
  }

  return options.length > 0 ? options : undefined;
}

/**
 * Toggle JSON Schema nullability while preserving the base type.
 *
 * @param schema - Existing schema object.
 * @param nullable - Whether null literals are allowed.
 * @returns New schema object with updated `type`.
 */
export function setSchemaNullable(
  schema: Record<string, unknown>,
  nullable: boolean,
): Record<string, unknown> {
  const valueType = valueTypeFromSchema(schema);
  const typeKeywords = schemaTypeForValueType(valueType);
  const next: Record<string, unknown> = { ...schema };

  if (nullable) {
    next.type = [typeKeywords.type, "null"];
  } else {
    next.type = typeKeywords.type;
  }

  if (typeKeywords.format) {
    next.format = typeKeywords.format;
  }

  return next;
}

/**
 * Derive the structured editor value type from a JSON Schema object.
 *
 * @param schema - Variable JSON Schema object.
 * @returns Structured value type implied by the schema.
 */
export function valueTypeFromSchema(
  schema: Record<string, unknown>,
): ValueType {
  const schemaType = baseSchemaType(schema) ?? schema.type;
  const schemaFormat = schema.format;

  if (schemaType === "boolean") {
    return "boolean";
  }
  if (schemaType === "integer") {
    return "integer";
  }
  if (schemaType === "number") {
    return "number";
  }
  if (schemaType === "string" && schemaFormat === "date") {
    return "date";
  }
  if (schemaType === "string") {
    return "string";
  }

  return "string";
}

/**
 * Derive the structured editor value type from a variable document.
 *
 * @param variable - Workspace variable.
 * @returns Current value type for the editor.
 */
export function valueTypeFromVariable(variable: Variable): ValueType {
  const fromSchema = valueTypeFromSchema(variable.schema);
  if (variable.schema.type !== undefined) {
    return fromSchema;
  }

  const defaultValue = variable.defaultValue;
  if (defaultValue.kind === "public_literal") {
    return valueTypeFromPublicLiteral(defaultValue, variable.schema);
  }

  return "string";
}

/**
 * Derive the structured editor value type from a public literal.
 *
 * @param literal - Public literal workspace value.
 * @param schema - Optional JSON Schema used for validation context.
 * @returns Current value type for the editor.
 */
export function valueTypeFromPublicLiteral(
  literal: Extract<WorkspaceValue, { kind: "public_literal" }>,
  schema?: Record<string, unknown>,
): ValueType {
  if (schema && schema.type !== undefined) {
    return valueTypeFromSchema(schema);
  }

  if (literal.dataType === "date") {
    return "date";
  }
  if (literal.dataType === "boolean") {
    return "boolean";
  }
  if (literal.dataType === "number") {
    return "number";
  }

  return "string";
}

/**
 * Apply a structured value type to a public literal workspace value.
 *
 * @param literal - Public literal being edited.
 * @param valueType - Selected value type.
 * @returns Updated public literal with coerced scalar and data type.
 */
export function applyPublicLiteralValueType(
  literal: Extract<WorkspaceValue, { kind: "public_literal" }>,
  valueType: ValueType,
  schema?: Record<string, unknown>,
): Extract<WorkspaceValue, { kind: "public_literal" }> {
  return {
    ...literal,
    dataType: dataTypeForValueType(valueType),
    value: coerceLiteralValue(literal.value, valueType, schema),
  };
}

/**
 * Map a structured value type to JSON Schema type and format keywords.
 *
 * @param valueType - Editor value type.
 * @returns Schema type and optional format.
 */
function schemaTypeForValueType(valueType: ValueType): {
  type: string;
  format?: string;
} {
  if (valueType === "integer") {
    return { type: "integer" };
  }
  if (valueType === "number") {
    return { type: "number" };
  }
  if (valueType === "boolean") {
    return { type: "boolean" };
  }
  if (valueType === "date") {
    return { type: "string", format: "date" };
  }
  return { type: "string" };
}

/**
 * Map a structured value type to a public literal data type.
 *
 * @param valueType - Editor value type.
 * @returns Workspace public literal data type.
 */
export function dataTypeForValueType(
  valueType: ValueType,
): "string" | "number" | "boolean" | "date" {
  if (valueType === "boolean") {
    return "boolean";
  }
  if (valueType === "integer" || valueType === "number") {
    return "number";
  }
  if (valueType === "date") {
    return "date";
  }
  return "string";
}

/**
 * Coerce a literal value to match a structured value type.
 *
 * @param value - Current literal value.
 * @param valueType - Target value type.
 * @returns Coerced scalar suitable for the type.
 */
export function coerceLiteralValue(
  value: JsonScalar | undefined,
  valueType: ValueType,
  schema?: Record<string, unknown>,
): JsonScalar {
  if (value === null && schema && schemaAllowsNull(schema)) {
    return null;
  }

  if (valueType === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return false;
  }

  if (valueType === "integer") {
    if (typeof value === "number" && Number.isInteger(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isInteger(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  if (valueType === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  if (valueType === "date") {
    if (typeof value === "string") {
      return value;
    }
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

/**
 * Build a schema object for a value type, preserving compatible constraints.
 *
 * @param schema - Existing schema object.
 * @param valueType - Target value type.
 * @returns New schema with updated type keywords and pruned constraints.
 */
function schemaForValueType(
  schema: Record<string, unknown>,
  valueType: ValueType,
): Record<string, unknown> {
  const allowedKeys = new Set(
    CONSTRAINT_CATALOG[valueType].map((definition) => definition.key),
  );
  allowedKeys.add(PREDEFINED_KEY);
  allowedKeys.add("type");
  if (valueType === "date") {
    allowedKeys.add("format");
  }

  const nullable = schemaAllowsNull(schema);
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (TYPE_MANAGED_KEYS.has(key)) {
      continue;
    }
    if (allowedKeys.has(key)) {
      next[key] = value;
    }
  }

  const typeKeywords = schemaTypeForValueType(valueType);
  if (nullable) {
    next.type = [typeKeywords.type, "null"];
  } else {
    next.type = typeKeywords.type;
  }
  if (typeKeywords.format) {
    next.format = typeKeywords.format;
  }

  return next;
}

/**
 * Apply a structured value type to a variable document.
 *
 * @param variable - Workspace variable being edited.
 * @param valueType - Selected value type.
 * @returns Updated variable with schema, data type, and coerced value.
 */
export function applyValueType(
  variable: Variable,
  valueType: ValueType,
): Variable {
  const defaultValue = variable.defaultValue;
  if (defaultValue.kind !== "public_literal") {
    return variable;
  }

  const nextSchema = schemaForValueType(variable.schema, valueType);
  const coercedValue = coerceLiteralValue(
    defaultValue.value,
    valueType,
    nextSchema,
  );

  return {
    ...variable,
    schema: nextSchema,
    defaultValue: {
      ...defaultValue,
      dataType: dataTypeForValueType(valueType),
      value: coercedValue,
    },
  };
}

/**
 * Look up a constraint definition for a value type and keyword.
 *
 * @param valueType - Structured value type.
 * @param key - JSON Schema keyword.
 * @returns Matching definition, if any.
 */
export function constraintDefinitionForKey(
  valueType: ValueType,
  key: string,
): ConstraintDefinition | undefined {
  return CONSTRAINT_CATALOG[valueType].find(
    (definition) => definition.key === key,
  );
}

/**
 * List active constraints present on a schema for a value type.
 *
 * @param schema - Variable JSON Schema object.
 * @param valueType - Structured value type.
 * @returns Active constraints with display labels.
 */
export function listConstraints(
  schema: Record<string, unknown>,
  valueType: ValueType,
): ActiveConstraint[] {
  const active: ActiveConstraint[] = [];

  for (const definition of CONSTRAINT_CATALOG[valueType]) {
    if (!(definition.key in schema)) {
      continue;
    }

    const value = schema[definition.key];
    active.push({
      key: definition.key,
      label: definition.label,
      value,
      displayValue: definition.formatDisplay(value),
    });
  }

  return active;
}

/**
 * Return constraint definitions not yet set on the schema.
 *
 * @param schema - Variable JSON Schema object.
 * @param valueType - Structured value type.
 * @returns Definitions available to add.
 */
export function availableConstraints(
  schema: Record<string, unknown>,
  valueType: ValueType,
): ConstraintDefinition[] {
  return CONSTRAINT_CATALOG[valueType].filter(
    (definition) => !(definition.key in schema),
  );
}

/**
 * Set one constraint keyword on a schema copy.
 *
 * @param schema - Existing schema object.
 * @param valueType - Structured value type.
 * @param key - JSON Schema keyword.
 * @param value - Parsed constraint value.
 * @returns New schema object with the constraint applied.
 */
export function setConstraint(
  schema: Record<string, unknown>,
  valueType: ValueType,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const definition = constraintDefinitionForKey(valueType, key);
  if (!definition) {
    return { ...schema };
  }

  return {
    ...schema,
    [key]: value,
  };
}

/**
 * Remove one constraint keyword from a schema copy.
 *
 * @param schema - Existing schema object.
 * @param key - JSON Schema keyword to remove.
 * @returns New schema object without the constraint.
 */
export function removeConstraint(
  schema: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const next = { ...schema };
  delete next[key];
  return next;
}

/**
 * One validation failure when a literal does not satisfy the variable schema.
 */
export type LiteralValidationIssue = {
  /** JSON Schema keyword that failed. */
  keyword: string;

  /** User-facing constraint label. */
  label: string;

  /** Detailed validation message. */
  message: string;
};

/**
 * Resolve a user-facing label for one failed JSON Schema keyword.
 *
 * @param valueType - Structured value type.
 * @param keyword - Failed JSON Schema keyword.
 * @returns Label shown in validation feedback.
 */
function validationLabelForKeyword(
  valueType: ValueType,
  keyword: string,
): string {
  if (keyword === "type") {
    return "Value type";
  }
  if (keyword === "format") {
    return valueType === "date" ? "Date format" : "Format";
  }

  return constraintDefinitionForKey(valueType, keyword)?.label ?? keyword;
}

/**
 * Format one Ajv error as a short validation message.
 *
 * @param error - Ajv validation error object.
 * @returns Message suitable for helper text.
 */
function formatAjvErrorMessage(error: ErrorObject): string {
  return error.message ?? "Value does not satisfy this constraint.";
}

/**
 * Validate a public literal value against a variable JSON Schema.
 *
 * @param schema - Variable JSON Schema object.
 * @param valueType - Structured editor value type.
 * @param value - Literal scalar being edited.
 * @returns Whether the value is valid and any constraint failures.
 */
export function validateLiteralAgainstSchema(
  schema: Record<string, unknown>,
  valueType: ValueType,
  value: JsonScalar,
): { valid: boolean; issues: LiteralValidationIssue[] } {
  const result = validateDataAgainstSchema(schema, value);
  if (result.valid) {
    return { valid: true, issues: [] };
  }

  const issues = (result.errors ?? []).map((error) => {
    const keyword = error.keyword ?? "unknown";
    return {
      keyword,
      label: validationLabelForKeyword(valueType, keyword),
      message: formatAjvErrorMessage(error),
    };
  });

  return { valid: false, issues };
}

/**
 * Parse raw text into a typed literal for one value type.
 *
 * @param raw - Raw text from an input or Autocomplete field.
 * @param valueType - Structured value type.
 * @returns Parsed scalar suitable for the type.
 */
export function parseLiteralFromRaw(
  raw: string,
  valueType: ValueType,
): JsonScalar {
  if (valueType === "boolean") {
    return raw === "true";
  }

  if (valueType === "integer") {
    const parsed = Number.parseInt(raw, 10);
    return Number.isInteger(parsed)
      ? parsed
      : coerceLiteralValue(raw, valueType);
  }

  if (valueType === "number") {
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed)
      ? parsed
      : coerceLiteralValue(raw, valueType);
  }

  return raw;
}

/**
 * Coerce an enum option value to the structured editor value type.
 *
 * @param option - One allowed enum entry.
 * @param valueType - Structured value type.
 * @returns Typed scalar for the literal editor.
 */
export function enumOptionToLiteral(
  option: unknown,
  valueType: ValueType,
): JsonScalar {
  if (valueType === "boolean") {
    if (typeof option === "boolean") {
      return option;
    }
    return parseLiteralFromRaw(String(option), valueType);
  }

  if (valueType === "integer" || valueType === "number") {
    if (typeof option === "number") {
      return option;
    }
    return parseLiteralFromRaw(String(option), valueType);
  }

  return String(option);
}

/**
 * Build helper text listing all literal validation failures.
 *
 * @param issues - Validation issues for the current literal.
 * @returns Helper text for the default value field.
 */
export function literalValidationHelperText(
  issues: LiteralValidationIssue[],
): string {
  return issues.map((issue) => `${issue.label}: ${issue.message}`).join(" · ");
}

/**
 * Keywords for constraints that failed validation.
 *
 * @param issues - Validation issues for the current literal.
 * @returns Set of failed JSON Schema keywords.
 */
export function failingConstraintKeywords(
  issues: LiteralValidationIssue[],
): Set<string> {
  return new Set(issues.map((issue) => issue.keyword));
}
