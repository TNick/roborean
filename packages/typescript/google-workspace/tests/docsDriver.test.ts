import { describe, expect, it } from "vitest";
import {
  documentOpsToDocsRequests,
  GOOGLE_DOCS_DRIVER_MANIFEST,
} from "../src/docsDriver.js";

describe("google docs driver", () => {
  it("declares browser execution support", () => {
    expect(GOOGLE_DOCS_DRIVER_MANIFEST.supportsBrowserExecution).toBe(true);
    expect(GOOGLE_DOCS_DRIVER_MANIFEST.requiresBackend).toBe(false);
  });

  it("maps append and replace ops into insertText", () => {
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
});
