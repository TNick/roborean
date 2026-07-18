import { describe, expect, it } from "vitest";
import {
  applyOpsToPlainText,
  documentOpsToDocsRequests,
  GOOGLE_DOCS_DRIVER_MANIFEST,
  plainTextToPreviewHtml,
} from "../src/docsDriver.js";
import { googleDocsPreviewUrl } from "../src/templatePaths.js";
import { createMemoryGoogleApis } from "../src/fake/memoryApis.js";

describe("google docs driver", () => {
  it("declares browser execution support", () => {
    expect(GOOGLE_DOCS_DRIVER_MANIFEST.supportsBrowserExecution).toBe(true);
    expect(GOOGLE_DOCS_DRIVER_MANIFEST.requiresBackend).toBe(false);
  });

  it("maps append and replace ops into insertText in legacy mode", () => {
    const requests = documentOpsToDocsRequests(
      [
        {
          documentId: "doc1",
          op: "replace_named_value",
          name: "who",
          value: { kind: "public_literal", dataType: "string", value: "Ada" },
        },
        {
          documentId: "doc1",
          op: "plain.append_text",
          text: "!",
        },
      ],
      "Hello {{who}}",
    );

    expect(requests).toEqual([
      {
        insertText: {
          location: { index: 1 },
          text: "Hello Ada!\n",
        },
      },
    ]);
  });

  it("maps native template ops into replaceAllText requests", () => {
    const requests = documentOpsToDocsRequests(
      [
        {
          documentId: "doc1",
          op: "replace_named_value",
          name: "who",
          value: { kind: "public_literal", dataType: "string", value: "Ada" },
        },
        {
          documentId: "doc1",
          op: "plain.replace_all",
          find: "TODO",
          replace: "DONE",
        },
        {
          documentId: "doc1",
          op: "flow.append_paragraph",
          text: "Footer",
        },
      ],
      { renderMode: "native" },
    );

    expect(requests).toEqual([
      {
        replaceAllText: {
          containsText: { text: "{{who}}", matchCase: true },
          replaceText: "Ada",
        },
      },
      {
        replaceAllText: {
          containsText: { text: "TODO", matchCase: true },
          replaceText: "DONE",
        },
      },
      {
        insertText: {
          endOfSegmentLocation: { segmentId: "" },
          text: "Footer\n",
        },
      },
    ]);
  });

  it("flattens ops to plain text for local preview", () => {
    const body = applyOpsToPlainText(
      [
        {
          documentId: "doc1",
          op: "replace_named_value",
          name: "who",
          value: { kind: "public_literal", dataType: "string", value: "Ada" },
        },
        {
          documentId: "doc1",
          op: "flow.append_paragraph",
          text: "Footer",
        },
      ],
      "Hello {{who}}",
    );
    expect(body).toBe("Hello AdaFooter\n");
  });

  it("wraps plain text as preview HTML", () => {
    expect(plainTextToPreviewHtml("a <b>")).toContain("&lt;b&gt;");
  });
});

describe("google docs preview urls", () => {
  it("builds read-only preview URLs", () => {
    expect(googleDocsPreviewUrl("abc123")).toBe(
      "https://docs.google.com/document/d/abc123/preview",
    );
  });
});

describe("drive exportText fake", () => {
  it("returns stored content for exported docs", async () => {
    const apis = createMemoryGoogleApis();
    apis.files.set("doc-1", {
      id: "doc-1",
      name: "Letter",
      mimeType: "application/vnd.google-apps.document",
      parents: ["root"],
      content: "Dear {{name}},",
    });
    await expect(apis.drive.exportText("doc-1")).resolves.toBe(
      "Dear {{name}},",
    );
  });
});
