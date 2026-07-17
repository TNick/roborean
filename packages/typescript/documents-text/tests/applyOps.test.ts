import { describe, expect, it } from "vitest";
import { applyTextOps } from "../src/index.js";

describe("applyTextOps", () => {
  it("replaces named slots like Python", () => {
    const result = applyTextOps("Hello, {{name}}!\n", [
      {
        documentId: "hello_doc",
        op: "replace_named_value",
        name: "name",
        value: { kind: "public_literal", dataType: "string", value: "Ada" },
      },
    ]);
    expect(result).toBe("Hello, Ada!\n");
  });
});
