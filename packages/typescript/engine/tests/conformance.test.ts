import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileProject,
  applyPatch,
  evaluateRule,
  runProject,
} from "../src/index.js";

const root = resolve(import.meta.dirname, "../../../../");
const fixture = (path: string): any =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));

describe("shared conformance fixtures", () => {
  for (const name of readdirSync(resolve(root, "conformance/rules"))) {
    it(`evaluates ${name}`, () => {
      const vector = fixture(`conformance/rules/${name}`);
      if (vector.expectedError)
        expect(() => evaluateRule(vector.rule, vector.workspace)).toThrow();
      else
        expect(evaluateRule(vector.rule, vector.workspace)).toBe(
          vector.expected,
        );
    });
  }
  for (const name of readdirSync(resolve(root, "conformance/patches"))) {
    it(`applies ${name}`, () => {
      const vector = fixture(`conformance/patches/${name}`);
      const [workspace, patch] = applyPatch(
        vector.initialWorkspace,
        vector.patch,
        {
          allowedWrites: vector.allowedWrites,
          constKeys: vector.constKeys,
          bitId: vector.id,
        },
      );
      expect(workspace.values).toEqual(vector.expectedWorkspace.values);
      expect(patch).toEqual(vector.expectedAppliedPatch);
    });
  }
  it("runs sequential built-in workspace bits", () => {
    const project = fixture("conformance/projects/02_set_and_copy.json");
    const compiled = compileProject(project);
    const result = runProject(compiled, project, { runId: "test" });
    expect(result.status).toBe("success");
    expect(result.bitResults.map((bit) => bit.status)).toEqual([
      "success",
      "success",
    ]);
  });
  it("compiles document bit projects with replace_named_value", () => {
    const project = fixture(
      "conformance/documents/D01_text_hello/project.json",
    );
    const compiled = compileProject(project);
    expect(compiled.bits.map((bit) => bit.type)).toEqual([
      "roborean.replace_named_value",
    ]);
  });
  it("rejects invalid undeclared writes during compilation", () => {
    expect(() =>
      compileProject(
        fixture("conformance/projects/05_invalid_undeclared_write.json"),
      ),
    ).toThrow();
  });
});
