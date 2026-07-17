import { describe, expect, it } from "vitest";
import { assertOpAllowed, validateDocumentOperations } from "../src/index.js";

const manifest = {
  driverId: "roborean.text",
  version: "0.3.0",
  irFamily: "plain",
  capabilities: ["replace_named_value", "finalize"],
  supportsPreview: true,
  supportsBrowserExecution: true,
  supportsDiff: true,
  requiresBackend: false,
  templateMediaTypes: ["text/plain"],
};

describe("document capabilities", () => {
  it("accepts allowed ops", () => {
    expect(() =>
      assertOpAllowed(manifest, { documentId: "d", op: "replace_named_value" }),
    ).not.toThrow();
  });

  it("rejects missing capabilities", () => {
    const diagnostics = validateDocumentOperations(
      [{ documentId: "d", op: "sheet.set_cell" }],
      manifest,
    );
    expect(diagnostics[0]?.code).toBe("E_CAPABILITY_MISSING");
  });
});
