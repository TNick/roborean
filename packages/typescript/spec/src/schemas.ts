import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import _Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import _addFormats from "ajv-formats";

const Ajv2020 = (
  _Ajv2020 as unknown as { default?: new (options?: object) => unknown }
).default ?? (_Ajv2020 as unknown as new (options?: object) => unknown);
const addFormats = (
  (_addFormats as unknown as { default?: (ajv: unknown) => unknown }).default ??
  _addFormats
) as (ajv: unknown) => unknown;

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null | undefined;
}

/** Finds the repository root by locating the canonical project schema. */
export function findRepoRoot(start = process.cwd()): string {
  let current = resolve(start);
  while (dirname(current) !== current) {
    if (existsSync(resolve(current, "schemas", "project.schema.json"))) return current;
    current = dirname(current);
  }
  throw new Error("Unable to locate schemas/project.schema.json");
}

/** Loads one canonical JSON Schema document by file name or logical name. */
export function loadSchema(name: string, root = findRepoRoot()): Record<string, unknown> {
  const file = name.endsWith(".json") ? name : `${name.replace(/\.schema$/, "")}.schema.json`;
  return JSON.parse(readFileSync(resolve(root, "schemas", file), "utf8")) as Record<string, unknown>;
}

function createAjv(root: string): {
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
  for (const name of [
    "workspace-value",
    "secret-ref",
    "variable",
    "workspace",
    "rule-ast",
    "bit",
    "bit-type-manifest",
    "document-definition",
    "workspace-patch",
    "compiled-project",
    "run-results",
    "project",
  ]) {
    ajv.addSchema(loadSchema(name, root));
  }
  return ajv;
}

/** Validates data with canonical Draft 2020-12 schemas. */
export function validate(schemaName: string, data: unknown, root = findRepoRoot()): ValidationResult {
  const ajv = createAjv(root);
  const schema = loadSchema(schemaName, root);
  const valid = ajv.validate(schema.$id as string, data);
  return { valid: Boolean(valid), errors: ajv.errors };
}
