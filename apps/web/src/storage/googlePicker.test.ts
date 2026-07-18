import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadGooglePicker,
  logGooglePickerDiagnostics,
  probeGooglePickerCredentials,
  resolveGoogleAppId,
} from "./googlePicker.js";

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

  it("normalizes an OAuth client id supplied as the explicit app id", () => {
    expect(
      resolveGoogleAppId(
        "999-client.apps.googleusercontent.com",
        "123456789012-client.apps.googleusercontent.com",
      ),
    ).toBe("123456789012");
  });

  it("ignores a malformed explicit app id and derives the project number", () => {
    expect(
      resolveGoogleAppId(
        "123456789012-client.apps.googleusercontent.com",
        "firebase-style-app-id",
      ),
    ).toBe("123456789012");
  });

  it("returns empty when the client id has no numeric prefix", () => {
    expect(resolveGoogleAppId("not-a-normal-client-id")).toBe("");
  });
});

describe("logGooglePickerDiagnostics", () => {
  it("reports runtime state without printing credential values", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logGooglePickerDiagnostics("test stage", { accessTokenPresent: true });

    expect(info).toHaveBeenCalledWith(
      "[Roborean Google Picker] test stage",
      expect.objectContaining({
        accessTokenPresent: true,
        apiKeyConfigured: false,
        apiKeySuffix: "not-configured",
      }),
    );
    info.mockRestore();
  });
});

describe("probeGooglePickerCredentials", () => {
  it("reports whether Drive accepts the same credential pair", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await probeGooglePickerCredentials("test-oauth-token");

    expect(fetchMock).toHaveBeenCalledOnce();

    // Inspect the request separately to ensure diagnostics do not receive it.
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toContain("/drive/v3/files");
    expect(requestInit).toEqual({
      headers: { Authorization: "Bearer test-oauth-token" },
    });
    expect(info).toHaveBeenLastCalledWith(
      "[Roborean Google Picker] credential probe completed",
      expect.objectContaining({
        driveApiAcceptedCredentials: true,
        driveApiStatus: 200,
      }),
    );

    fetchMock.mockRestore();
    info.mockRestore();
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
