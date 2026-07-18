import { describe, expect, it } from "vitest";

import { bitTypeDisplayName } from "../src/utils/bitTypeDisplayName.js";

describe("bitTypeDisplayName", () => {
  it("returns manifest names for known bit types", () => {
    expect(bitTypeDisplayName("roborean.set_variable")).toBe("Set variable");
    expect(bitTypeDisplayName("roborean.replace_named_value")).toBe(
      "Replace named value",
    );
  });

  it("derives a fallback label for unknown bit types", () => {
    expect(bitTypeDisplayName("roborean.custom_bit")).toBe("Custom Bit");
  });
});
