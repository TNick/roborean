import { describe, expect, it } from "vitest";
import type { Bit } from "@roborean/spec";
import { syncBitDeclaredAccess } from "../src/syncBitDeclaredAccess.js";

/**
 * Minimal set_variable bit for sync tests.
 *
 * @param overrides - Fields to merge onto the default bit.
 * @returns Bit document.
 */
function setVariableBit(overrides: Partial<Bit> = {}): Bit {
  return {
    id: "bit_1",
    type: "roborean.set_variable",
    when: true,
    config: {
      key: "variable_1",
      value: { kind: "public_literal", dataType: "string", value: "x" },
    },
    reads: [],
    writes: [],
    emits: [],
    effectClass: "workspace",
    onError: "abort",
    capabilities: [],
    ...overrides,
  };
}

describe("syncBitDeclaredAccess", () => {
  it("adds writes for set_variable config.key", () => {
    const next = syncBitDeclaredAccess(setVariableBit());
    expect(next.writes).toEqual(["variable_1"]);
    expect(next.reads).toEqual([]);
  });

  it("replaces stale set_variable writes when the key changes", () => {
    const next = syncBitDeclaredAccess(
      setVariableBit({
        config: {
          key: "variable_2",
          value: { kind: "public_literal", dataType: "string", value: "x" },
        },
        writes: ["variable_1"],
      }),
    );
    expect(next.writes).toEqual(["variable_2"]);
  });

  it("syncs copy_variable reads and writes from from/to", () => {
    const next = syncBitDeclaredAccess({
      id: "bit_2",
      type: "roborean.copy_variable",
      when: true,
      config: { from: "a", to: "b" },
      reads: [],
      writes: [],
      emits: [],
      effectClass: "workspace",
      onError: "abort",
      capabilities: [],
    });
    expect(next.reads).toEqual(["a"]);
    expect(next.writes).toEqual(["b"]);
  });

  it("returns the same bit when already synchronized", () => {
    const bit = setVariableBit({ writes: ["variable_1"] });
    expect(syncBitDeclaredAccess(bit)).toBe(bit);
  });
});
