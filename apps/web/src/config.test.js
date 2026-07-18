import { describe, expect, it } from "vitest";
import { resolveStorageMode } from "./config.js";
describe("resolveStorageMode", () => {
  it("returns a supported storage mode", () => {
    const mode = resolveStorageMode();
    expect(mode === "api" || mode === "google").toBe(true);
  });
});
