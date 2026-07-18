import { describe, expect, it } from "vitest";
import {
  isStorageSource,
  projectPath,
  resolveStorageMode,
  runPath,
} from "./config.js";

describe("resolveStorageMode", () => {
  it("returns a supported storage mode", () => {
    const mode = resolveStorageMode();
    expect(mode === "api" || mode === "google").toBe(true);
  });
});

describe("isStorageSource", () => {
  it("accepts api and google", () => {
    expect(isStorageSource("api")).toBe(true);
    expect(isStorageSource("google")).toBe(true);
    expect(isStorageSource("other")).toBe(false);
  });
});

describe("projectPath", () => {
  it("builds a sourced project path", () => {
    expect(projectPath("api", "demo.project")).toBe(
      "/projects/api/demo.project",
    );
    expect(projectPath("google", "a/b")).toBe("/projects/google/a%2Fb");
  });
});

describe("runPath", () => {
  it("builds a sourced run path", () => {
    expect(runPath("api", "run-1")).toBe("/runs/api/run-1");
  });
});
