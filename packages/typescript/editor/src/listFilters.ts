import type {
  Bit,
  DocumentDefinition,
  Variable,
  WorkspaceValue,
} from "@roborean/spec";

import { bitDisplayLabel } from "./utils/bitDisplayLabel.js";
import { bitTypeDisplayName } from "./utils/bitTypeDisplayName.js";

/**
 * Normalize a search needle for case-insensitive substring matching.
 *
 * @param query - Raw user search text.
 * @returns Trimmed lowercase query, or empty when blank.
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Return true when `haystack` contains the normalized query.
 *
 * @param haystack - Text to search within.
 * @param query - Raw user search text.
 * @returns Whether the query matches the haystack.
 */
export function matchesSearchText(haystack: string, query: string): boolean {
  const needle = normalizeSearchQuery(query);

  if (!needle) {
    return true;
  }

  return haystack.toLowerCase().includes(needle);
}

/**
 * Build searchable text from a workspace default value.
 *
 * @param defaultValue - Variable default value definition.
 * @returns Flattened searchable content for the value.
 */
export function workspaceValueSearchText(defaultValue: WorkspaceValue): string {
  switch (defaultValue.kind) {
    case "public_literal":
      return String(defaultValue.value);
    case "secret_ref":
      return [defaultValue.ref, defaultValue.displayHint]
        .filter(Boolean)
        .join(" ");
    case "eq_token":
      return [defaultValue.token, defaultValue.domain]
        .filter(Boolean)
        .join(" ");
    case "shape_token":
      return [defaultValue.shape, defaultValue.length?.toString()]
        .filter(Boolean)
        .join(" ");
    case "bucket":
      return [defaultValue.bucket, defaultValue.bounds?.join("-")]
        .filter(Boolean)
        .join(" ");
    case "redacted":
      return defaultValue.reason;
    default:
      return "";
  }
}

/**
 * Build searchable text for a workspace variable row.
 *
 * @param variable - Workspace variable definition.
 * @returns Flattened searchable text for key, description, and value.
 */
export function variableSearchText(variable: Variable): string {
  return [
    variable.key,
    variable.description ?? "",
    workspaceValueSearchText(variable.defaultValue),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Filter workspace variables by key, description, and default value content.
 *
 * @param variables - Variables to filter.
 * @param query - Raw user search text.
 * @returns Variables matching the query.
 */
export function filterVariables(
  variables: Variable[],
  query: string,
): Variable[] {
  return variables.filter((variable) =>
    matchesSearchText(variableSearchText(variable), query),
  );
}

/**
 * Filter bits by label, type, and id.
 *
 * @param bits - Bits to filter.
 * @param query - Raw user search text.
 * @returns Bits matching the query.
 */
export function filterBits(bits: Bit[], query: string): Bit[] {
  return bits.filter((bit) =>
    matchesSearchText(
      [
        bitDisplayLabel(bit),
        bitTypeDisplayName(bit.type),
        bit.type,
        bit.id,
      ].join(" "),
      query,
    ),
  );
}

/**
 * Filter document definitions by id, type, and driver.
 *
 * @param documents - Document definitions to filter.
 * @param query - Raw user search text.
 * @returns Documents matching the query.
 */
export function filterDocuments(
  documents: DocumentDefinition[],
  query: string,
): DocumentDefinition[] {
  return documents.filter((document) =>
    matchesSearchText(
      [document.id, document.title, document.type, document.driver].join(" "),
      query,
    ),
  );
}
