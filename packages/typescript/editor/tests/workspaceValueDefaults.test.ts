import { describe, expect, it } from "vitest";

import { seedBitConfig } from "../src/entityDefaults.js";
import {
  bindPublicLiteralToVariableSchema,
  isWorkspaceValue,
  normalizeWorkspaceValue,
} from "../src/forms/workspaceValueDefaults.js";
import { getBitManifest } from "../src/bitManifestRegistry.js";

describe("workspaceValueDefaults", () => {
  it("normalizes legacy string config values", () => {
    expect(normalizeWorkspaceValue("World")).toEqual({
      kind: "public_literal",
      dataType: "string",
      value: "World",
    });
  });

  it("recognizes workspace value documents", () => {
    const value = {
      kind: "public_literal",
      dataType: "string",
      value: "World",
    } as const;

    expect(isWorkspaceValue(value)).toBe(true);
    expect(normalizeWorkspaceValue(value)).toEqual(value);
  });

  it("binds public literals to a declared variable schema type", () => {
    expect(
      bindPublicLiteralToVariableSchema(
        {
          kind: "public_literal",
          dataType: "string",
          value: "42",
        },
        { type: "integer" },
      ),
    ).toEqual({
      kind: "public_literal",
      dataType: "number",
      value: 42,
    });
  });

  it("preserves null when binding to a nullable variable schema", () => {
    expect(
      bindPublicLiteralToVariableSchema(
        {
          kind: "public_literal",
          dataType: "string",
          value: null,
        },
        { type: ["string", "null"] },
      ),
    ).toEqual({
      kind: "public_literal",
      dataType: "string",
      value: null,
    });
  });
});

describe("seedBitConfig", () => {
  it("seeds set_variable value as a public literal workspace value", () => {
    const manifest = getBitManifest("roborean.set_variable");
    const config = seedBitConfig(manifest?.configSchema, {
      schemaVersion: "1.0.0",
      id: "p1",
      name: "P1",
      pluginRequirements: [],
      workspace: { variables: [] },
      bits: [],
      documents: [],
      templates: [],
      metadata: {},
    });

    expect(config.value).toEqual({
      kind: "public_literal",
      dataType: "string",
      value: "",
    });
  });
});
