import _Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import _addFormats from "ajv-formats";

import { EMBEDDED_SCHEMAS } from "./embedded_schemas.js";

const Ajv2020 =
  (_Ajv2020 as unknown as { default?: new (options?: object) => unknown })
    .default ??
  (_Ajv2020 as unknown as new (options?: object) => unknown);
const addFormats = (
  (_addFormats as unknown as { default?: (ajv: unknown) => unknown }).default ??
  _addFormats
) as (ajv: unknown) => unknown;

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null | undefined;
}

function schemaKey(name: string): string {
  return name
    .replace(/\.schema\.json$/i, "")
    .replace(/\.schema$/i, "")
    .replace(/\.json$/i, "");
}

/** Loads one canonical JSON Schema document by file name or logical name. */
export function loadSchema(name: string): Record<string, unknown> {
  const key = schemaKey(name);
  const schema = EMBEDDED_SCHEMAS[key];
  if (!schema) {
    throw new Error(`Unknown schema: ${name}`);
  }
  return structuredClone(schema);
}

function createAjv(): {
  addSchema: (schema: object) => void;
  validate: (schemaKey: string, data: unknown) => boolean;
  errors: ErrorObject[] | null | undefined;
} {
  const ajv = new Ajv2020({ allErrors: true, strict: false }) as {
    addSchema: (schema: object) => void;
    validate: (schemaKey: string, data: unknown) => boolean;
    errors: ErrorObject[] | null | undefined;
  };
  addFormats(ajv);

  // Register every embedded schema so $ref resolution works across documents.
  for (const schema of Object.values(EMBEDDED_SCHEMAS)) {
    ajv.addSchema(schema);
  }
  return ajv;
}

/** Validates data with canonical Draft 2020-12 schemas. */
export function validate(
  schemaName: string,
  data: unknown,
): ValidationResult {
  const ajv = createAjv();
  const schema = loadSchema(schemaName);
  const valid = ajv.validate(schema.$id as string, data);
  return { valid: Boolean(valid), errors: ajv.errors };
}
