import { describe, expect, it } from "vitest";
import { createBrowserTokenProvider } from "../src/auth.js";

describe("browser token provider", () => {
  it("selects an account before issuing the first token", async () => {
    // Record prompts passed to Google Identity Services.
    const prompts: Array<string | undefined> = [];

    // Provide a deterministic Google Identity Services client.
    const provider = createBrowserTokenProvider({
      clientId: "1234567890-example.apps.googleusercontent.com",
      host: {
        google: {
          accounts: {
            oauth2: {
              initTokenClient: (config) => ({
                requestAccessToken: (options) => {
                  prompts.push(options?.prompt);
                  config.callback({
                    access_token: "token",
                    expires_in: 61,
                  });
                },
              }),
            },
          },
        },
      },
    });

    // Request the first token through the interactive account chooser.
    await expect(provider.getAccessToken()).resolves.toBe("token");
    expect(prompts).toEqual(["select_account"]);
  });
});
