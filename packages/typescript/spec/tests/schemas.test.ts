import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSchema, projectSchema, validate } from "../src/index.js";

describe("canonical schemas", () => {
  it("loads project schema and parses minimal fixture", () => {
    const root = resolve(import.meta.dirname, "../../../../");
    const fixture = JSON.parse(
      readFileSync(
        resolve(root, "conformance/projects/01_minimal.json"),
        "utf8",
      ),
    );
    expect(loadSchema("project").title).toBe("Project");
    expect(validate("project", fixture).valid).toBe(true);
    expect(projectSchema.parse(fixture).id).toBe("example.minimal");
  });
});
