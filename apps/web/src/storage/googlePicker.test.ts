import { describe, expect, it } from "vitest";
import { resolveGoogleAppId } from "./googlePicker.js";

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
