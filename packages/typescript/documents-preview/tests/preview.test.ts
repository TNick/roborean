import { describe, expect, it } from "vitest";
import { previewDocument } from "../src/index.js";

describe("previewDocument", () => {
  it("previews text documents", () => {
    const preview = previewDocument({
      definition: { id: "hello_doc", type: "text", driver: "roborean.text" },
      templateText: "Hello, {{name}}!\n",
      ops: [
        {
          documentId: "hello_doc",
          op: "replace_named_value",
          name: "name",
          value: { kind: "public_literal", dataType: "string", value: "Ada" },
        },
      ],
    });
    expect(preview.mode).toBe("text");
    expect(preview.body).toBe("Hello, Ada!\n");
  });
});
