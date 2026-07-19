import { afterEach, describe, expect, it, vi } from "vitest";
import {
  logGooglePickerDiagnostics,
  probeGoogleOAuthToken,
  resolveGoogleAppId,
} from "./googlePicker.js";

afterEach(() => {
  vi.restoreAllMocks();
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
  it("reports redacted deployment state and clarifies referrer diagnostics", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logGooglePickerDiagnostics("test stage", { accessTokenPresent: true });
    const details = info.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(details).toMatchObject({
      accessTokenPresent: true,
      inboundDocumentReferrer: "none",
      outboundHttpRefererInspectableInNetworkPanel: true,
    });
    expect(details).not.toHaveProperty("referrer");
    expect(JSON.stringify(details)).not.toContain("test-oauth-token");
  });
});

describe("probeGoogleOAuthToken", () => {
  it("uses only the OAuth authorization header for the Drive request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await probeGoogleOAuthToken("test-oauth-token");
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toContain("/drive/v3/files");
    expect(String(requestUrl)).not.toContain("key=");
    expect(requestInit).toEqual({
      headers: { Authorization: "Bearer test-oauth-token" },
    });
    expect(info).toHaveBeenLastCalledWith(
      "[Roborean Google Picker] OAuth token probe completed",
      expect.objectContaining({
        driveApiAcceptedOAuthToken: true,
        driveApiStatus: 200,
      }),
    );
  });
});
