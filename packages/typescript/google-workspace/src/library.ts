/** Bundled Google Docs catalog entry used without the FastAPI service. */
export type GoogleTemplateLibraryEntry = {
  id: string;
  kind: "document" | "starter" | "recipe";
  title: string;
  description: string;
  documentType?: string;
  driver?: string;
  tags: string[];
  path?: string;
  mediaType?: string;
  project?: Record<string, unknown>;
};

/** Plain-text Google Docs seed body. */
export type GoogleTemplateSeed = { text: string; mediaType: string };

const seeds: Record<string, GoogleTemplateSeed> = {
  letter: { text: "Dear {{name}},\n\n{{sender}}", mediaType: "text/plain" },
  invoiceNote: {
    text: "Invoice note for {{name}}\n\n{{sender}}",
    mediaType: "text/plain",
  },
};

const helloStarter = {
  id: "gdoc-hello",
  name: "Google Docs hello",
  schemaVersion: "1.0.0",
  workspace: {
    variables: [
      { key: "name", kind: "string", default: "World" },
      { key: "sender", kind: "string", default: "Roborean" },
    ],
  },
  bits: [],
  documents: [
    {
      id: "letter",
      title: "Letter",
      type: "docx",
      driver: "roborean.google.docs",
      templateRef: "letter_tpl",
      outputTarget: "letter.docx",
      settings: {},
      preview: { mode: "none", enabled: true },
    },
  ],
  templates: [{ id: "letter_tpl", path: "gdrive-seed:letter" }],
  pluginRequirements: [],
};

const entries: GoogleTemplateLibraryEntry[] = [
  {
    id: "gdoc-letter",
    kind: "document",
    title: "Google Docs letter",
    description: "A simple letter with name and sender placeholders.",
    documentType: "docx",
    driver: "roborean.google.docs",
    tags: ["google-docs"],
    path: "gdrive-seed:letter",
    mediaType: "text/plain",
  },
  {
    id: "gdoc-invoice-note",
    kind: "document",
    title: "Google Docs invoice note",
    description: "A concise invoice note with placeholders.",
    documentType: "docx",
    driver: "roborean.google.docs",
    tags: ["google-docs"],
    path: "gdrive-seed:invoiceNote",
    mediaType: "text/plain",
  },
  {
    id: "gdoc-hello-starter",
    kind: "starter",
    title: "Google Docs hello starter",
    description: "A runnable project with a materialized Google Docs letter.",
    tags: ["google-docs"],
    project: helloStarter,
  },
];

/** List the bundled catalog entries. */
export function listGoogleTemplateLibrary(): GoogleTemplateLibraryEntry[] {
  return structuredClone(entries);
}

/** Load one bundled catalog entry. */
export function getGoogleTemplateLibraryEntry(
  id: string,
): GoogleTemplateLibraryEntry | undefined {
  return structuredClone(entries.find((entry) => entry.id === id));
}

/** Load a bundled seed referenced by gdrive-seed:{id}. */
export function getGoogleTemplateLibrarySeed(
  id: string,
): GoogleTemplateSeed | undefined {
  return structuredClone(seeds[id]);
}

/** Extract a seed id from an internal catalog-only template path. */
export function googleSeedId(path: string): string | undefined {
  return path.startsWith("gdrive-seed:")
    ? path.slice("gdrive-seed:".length) || undefined
    : undefined;
}
