import type { DocumentDefinition, Project } from "@roborean/spec";
import { describe, expect, it } from "vitest";

import { documentDisplayTitle } from "../src/utils/documentDisplayTitle.js";
import {
  forkDocumentTemplate,
  gcUnusedTemplates,
  revertDocumentTemplate,
} from "../src/utils/documentTemplateCow.js";

const baseDocument: DocumentDefinition = {
  id: "doc_1",
  title: "Invoice",
  type: "text",
  driver: "roborean.text",
  templateRef: "shared",
};

const baseProject: Project = {
  schemaVersion: "1.1.0",
  id: "p1",
  name: "P1",
  pluginRequirements: [],
  workspace: { variables: [] },
  bits: [],
  documents: [baseDocument],
  templates: [{ id: "shared", path: "templates/shared.txt" }],
  metadata: {},
};

describe("documentDisplayTitle", () => {
  it("prefers title over id", () => {
    expect(documentDisplayTitle(baseDocument)).toBe("Invoice");
  });

  it("falls back to id when title is blank", () => {
    expect(documentDisplayTitle({ ...baseDocument, title: "   " })).toBe(
      "doc_1",
    );
  });
});

describe("documentTemplateCow", () => {
  it("forks a template without mutating the base ref", () => {
    const forked = forkDocumentTemplate(
      baseProject,
      baseDocument,
      "doc_1_local",
      "templates/doc_1_local.txt",
    );
    expect(forked.document.templateRef).toBe("doc_1_local");
    expect(forked.document.baseTemplateRef).toBe("shared");
    expect(
      forked.project.templates.some((entry) => entry.id === "doc_1_local"),
    ).toBe(true);
  });

  it("reverts a fork and gc orphaned templates", () => {
    const forked = forkDocumentTemplate(
      baseProject,
      baseDocument,
      "doc_1_local",
      "templates/doc_1_local.txt",
    );
    const reverted = revertDocumentTemplate(forked.project, forked.document);
    expect(reverted.document.templateRef).toBe("shared");
    expect(reverted.document.baseTemplateRef).toBeUndefined();
    const trimmed = gcUnusedTemplates(reverted.project);
    expect(trimmed.some((entry) => entry.id === "doc_1_local")).toBe(false);
  });
});
