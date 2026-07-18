import type { Bit, DocumentDefinition, Variable } from "@roborean/spec";
import { describe, expect, it } from "vitest";

import {
  filterBits,
  filterDocuments,
  filterVariables,
  matchesSearchText,
  variableSearchText,
  workspaceValueSearchText,
} from "../src/listFilters.js";

describe("listFilters", () => {
  describe("matchesSearchText", () => {
    it("matches case-insensitive substrings", () => {
      expect(matchesSearchText("Hello World", "world")).toBe(true);
      expect(matchesSearchText("Hello World", "WORLD")).toBe(true);
      expect(matchesSearchText("Hello World", "moon")).toBe(false);
    });

    it("treats blank queries as matching everything", () => {
      expect(matchesSearchText("anything", "   ")).toBe(true);
    });
  });

  describe("variableSearchText", () => {
    it("includes key, description, and literal default value", () => {
      const variable: Variable = {
        key: "customerName",
        description: "Primary contact",
        schema: { type: "string" },
        defaultValue: {
          kind: "public_literal",
          dataType: "string",
          value: "Acme Corp",
        },
        exposure: "clientVisible",
      };

      expect(variableSearchText(variable)).toContain("customerName");
      expect(variableSearchText(variable)).toContain("Primary contact");
      expect(variableSearchText(variable)).toContain("Acme Corp");
    });

    it("includes secret ref and display hint content", () => {
      const text = workspaceValueSearchText({
        kind: "secret_ref",
        ref: "vault/api-key",
        displayHint: "API key",
      });

      expect(text).toContain("vault/api-key");
      expect(text).toContain("API key");
    });
  });

  describe("filterVariables", () => {
    const variables: Variable[] = [
      {
        key: "alpha",
        description: "First variable",
        schema: { type: "string" },
        defaultValue: {
          kind: "public_literal",
          dataType: "string",
          value: "one",
        },
        exposure: "clientVisible",
      },
      {
        key: "beta",
        schema: { type: "number" },
        defaultValue: {
          kind: "public_literal",
          dataType: "number",
          value: 42,
        },
        exposure: "backendOnly",
      },
    ];

    it("filters by key", () => {
      expect(filterVariables(variables, "alpha")).toHaveLength(1);
      expect(filterVariables(variables, "alpha")[0]?.key).toBe("alpha");
    });

    it("filters by description", () => {
      expect(filterVariables(variables, "first")).toHaveLength(1);
    });

    it("filters by default value content", () => {
      expect(filterVariables(variables, "42")).toHaveLength(1);
      expect(filterVariables(variables, "42")[0]?.key).toBe("beta");
    });
  });

  describe("filterBits", () => {
    const bits: Bit[] = [
      {
        id: "bit-1",
        type: "roborean.noop",
        label: "Initialize",
        when: true,
        config: {},
        reads: [],
        writes: [],
        emits: [],
        effectClass: "pure",
        onError: "abort",
        capabilities: [],
      },
      {
        id: "bit-2",
        type: "roborean.set_variable",
        when: true,
        config: {},
        reads: [],
        writes: [],
        emits: [],
        effectClass: "workspace",
        onError: "abort",
        capabilities: [],
      },
    ];

    it("filters by label, type, and id", () => {
      expect(filterBits(bits, "initialize")).toHaveLength(1);
      expect(filterBits(bits, "set_variable")).toHaveLength(1);
      expect(filterBits(bits, "bit-2")).toHaveLength(1);
    });
  });

  describe("filterDocuments", () => {
    const documents: DocumentDefinition[] = [
      {
        id: "invoice",
        title: "Customer invoice",
        type: "docx",
        driver: "python-docx",
        templateRef: "templates/invoice.docx",
        irFamily: "office",
        preview: { mode: "html", enabled: true },
      },
      {
        id: "summary",
        title: "Executive summary",
        type: "markdown",
        driver: "builtin",
        templateRef: "templates/summary.md",
        irFamily: "text",
        preview: { mode: "html", enabled: true },
      },
    ];

    it("filters by id, title, type, and driver", () => {
      expect(filterDocuments(documents, "invoice")).toHaveLength(1);
      expect(filterDocuments(documents, "executive")).toHaveLength(1);
      expect(filterDocuments(documents, "markdown")).toHaveLength(1);
      expect(filterDocuments(documents, "python-docx")).toHaveLength(1);
    });
  });
});
