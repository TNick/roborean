/**
 * Catalog entry kinds exposed by the global template library API.
 */
export type TemplateLibraryKind = "document" | "starter" | "recipe";

/**
 * Required bit type row for recipe catalog entries.
 */
export type RequiredBitTypeSummary = {
  /** Bit type identifier. */
  typeId: string;

  /** Human-readable bit type name. */
  name: string;
};

/**
 * Summary row returned by GET /v1/template-library.
 */
export type TemplateLibraryEntry = {
  /** Stable catalog entry identifier. */
  id: string;

  /** Entry kind: document template, project starter, or bit recipe. */
  kind: TemplateLibraryKind;

  /** Human-readable catalog title. */
  title: string;

  /** Optional longer description. */
  description?: string | null;

  /** Document type for document entries. */
  documentType?: string | null;

  /** Document driver id for document entries. */
  driver?: string | null;

  /** Intermediate representation family for document entries. */
  irFamily?: string | null;

  /** Optional discovery tags. */
  tags?: string[];

  /** Template semver for document entries. */
  templateVersion?: string | null;

  /** Named template inputs for document entries. */
  requiredInputs?: string[];

  /** Declared document capabilities for document entries. */
  capabilities?: string[];

  /** Relative template path for document entries. */
  path?: string | null;

  /** MIME type for document template bytes. */
  mediaType?: string | null;

  /** Variable count for starters and recipes. */
  variableCount?: number | null;

  /** Bit count for starters and recipes. */
  bitCount?: number | null;

  /** Document count for starters and recipes. */
  documentCount?: number | null;

  /** Required bit types for recipe entries. */
  requiredBitTypes?: RequiredBitTypeSummary[];
};

/**
 * Full catalog entry returned by GET /v1/template-library/{id}.
 */
export type TemplateLibraryDetail = TemplateLibraryEntry & {
  /** Parsed template manifest for document entries. */
  manifest?: Record<string, unknown> | null;

  /** Starter project document for starter entries. */
  project?: Record<string, unknown> | null;

  /** Recipe document for recipe entries. */
  recipe?: Record<string, unknown> | null;
};

/**
 * Props for the reusable TemplatesLibrary presentation component.
 */
export type TemplatesLibraryProps = {
  /** Catalog entries to render (typically from the API). */
  entries: TemplateLibraryEntry[];

  /** True while the catalog is loading. */
  loading?: boolean;

  /** Optional load error message. */
  error?: string | null;

  /** Entry ids with in-flight actions. */
  busyIds?: string[];

  /**
   * Called when the user imports a document template into a project.
   *
   * @param entry - Selected document catalog entry.
   */
  onImportDocument?: (entry: TemplateLibraryEntry) => void;

  /**
   * Called when the user creates a project from a starter entry.
   *
   * @param entry - Selected starter catalog entry.
   */
  onUseProjectStarter?: (entry: TemplateLibraryEntry) => void;

  /**
   * Called when the user imports a recipe into a project.
   *
   * @param entry - Selected recipe catalog entry.
   */
  onImportRecipe?: (entry: TemplateLibraryEntry) => void;
};

/**
 * Filter catalog entries by kind and optional search query.
 *
 * @param entries - Full catalog list.
 * @param kind - Entry kind for the active tab.
 * @param query - Case-insensitive search string.
 * @returns Entries matching the tab and query.
 */
export function filterTemplateLibraryEntries(
  entries: TemplateLibraryEntry[],
  kind: TemplateLibraryKind,
  query: string,
): TemplateLibraryEntry[] {
  // Keep only rows for the active tab.
  const normalized = query.trim().toLowerCase();
  const tabEntries = entries.filter((entry) => entry.kind === kind);

  if (!normalized) {
    return tabEntries;
  }

  // Match title, description, tags, and document type text.
  return tabEntries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.description ?? "",
      entry.documentType ?? "",
      ...(entry.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

/**
 * Collect unique document types from document catalog entries.
 *
 * @param entries - Catalog entries (any kind).
 * @returns Sorted unique document types.
 */
export function documentTypeFilters(entries: TemplateLibraryEntry[]): string[] {
  const types = new Set<string>();

  for (const entry of entries) {
    if (entry.kind === "document" && entry.documentType) {
      types.add(entry.documentType);
    }
  }

  return [...types].sort();
}

/**
 * Collect unique tags from recipe catalog entries.
 *
 * @param entries - Catalog entries (any kind).
 * @returns Sorted unique recipe tags.
 */
export function recipeTagFilters(entries: TemplateLibraryEntry[]): string[] {
  const tags = new Set<string>();

  for (const entry of entries) {
    if (entry.kind !== "recipe") {
      continue;
    }
    for (const tag of entry.tags ?? []) {
      tags.add(tag);
    }
  }

  return [...tags].sort();
}
