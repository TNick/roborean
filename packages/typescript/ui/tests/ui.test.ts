import { describe, expect, it } from "vitest";

import { CollapsibleSearchField, Panel } from "../src/index.js";

describe("@roborean/ui", () => {
  it("loads", () => {
    expect(true).toBe(true);
  });

  it("exports panel search components", () => {
    expect(typeof Panel).toBe("function");
    expect(typeof CollapsibleSearchField).toBe("function");
  });
});
