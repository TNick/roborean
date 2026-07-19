import { describe, expect, it } from "vitest";

import {
  coerceTemplateLibraryEntries,
  documentTypeFilters,
  filterTemplateLibraryEntries,
  recipeTagFilters,
  type TemplateLibraryEntry,
} from "../src/templatesLibraryTypes.js";

const SAMPLE_ENTRIES: TemplateLibraryEntry[] = [
  {
    id: "hello",
    kind: "document",
    title: "Hello text",
    description: "Greeting template",
    documentType: "text",
    tags: ["text"],
  },
  {
    id: "set-and-copy",
    kind: "starter",
    title: "Set and copy",
    description: "Workspace starter",
    tags: ["workspace"],
    variableCount: 6,
    bitCount: 11,
    documentCount: 3,
  },
  {
    id: "set-and-copy-title",
    kind: "recipe",
    title: "Set and copy title",
    tags: ["workspace", "recipe"],
    bitCount: 2,
  },
];

describe("TemplatesLibrary helpers", () => {
  it("filters entries by tab kind and search query", () => {
    const rows = filterTemplateLibraryEntries(
      SAMPLE_ENTRIES,
      "document",
      "greeting",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("hello");
  });

  it("collects document type chips", () => {
    expect(documentTypeFilters(SAMPLE_ENTRIES)).toEqual(["text"]);
  });

  it("collects recipe tag chips", () => {
    expect(recipeTagFilters(SAMPLE_ENTRIES)).toEqual(["recipe", "workspace"]);
  });

  it("drops malformed catalog rows", () => {
    expect(
      coerceTemplateLibraryEntries([
        SAMPLE_ENTRIES[0],
        undefined,
        { id: "broken" },
      ]),
    ).toEqual([SAMPLE_ENTRIES[0]]);
  });
});
