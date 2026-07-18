import { afterEach, describe, expect, it, vi } from "vitest";
import { loadGooglePicker, resolveGoogleAppId } from "./googlePicker.js";

afterEach(() => {
  delete (globalThis as { gapi?: unknown }).gapi;
  delete (globalThis as { google?: unknown }).google;
});

describe("resolveGoogleAppId", () => {
  it("uses an explicit app id when provided", () => {
    expect(
      resolveGoogleAppId("999-abc.apps.googleusercontent.com", "123456789012"),
    ).toBe("123456789012");
  });

  it("derives the project number from the OAuth client id", () => {
    expect(
      resolveGoogleAppId("123456789012-abcdef.apps.googleusercontent.com"),
    ).toBe("123456789012");
  });

  it("returns empty when the client id has no numeric prefix", () => {
    expect(resolveGoogleAppId("not-a-normal-client-id")).toBe("");
  });
});

describe("loadGooglePicker", () => {
  it("loads Picker without the legacy gapi client", async () => {
    // Capture the requested gapi module and expose Picker in its callback.
    const load = vi.fn((api: string, callback: () => void) => {
      (globalThis as { google?: { picker: object } }).google = { picker: {} };
      callback();
    });
    (globalThis as { gapi?: { load: typeof load } }).gapi = { load };

    await loadGooglePicker();

    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith("picker", expect.any(Function));
  });
});
