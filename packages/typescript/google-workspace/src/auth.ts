import { GoogleWorkspaceError } from "./errors.js";
import type { AccessTokenProvider } from "./types.js";

/**
 * Google Identity Services token client surface used by the browser.
 */
export type GoogleTokenClient = {
  /**
   * Request an access token interactively or silently.
   *
   * @param overrideConfig - Optional request overrides.
   */
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

/**
 * Minimal GIS oauth2 namespace.
 */
export type GoogleIdentityOauth2 = {
  /**
   * Initialize a token client.
   *
   * @param config - Token client configuration.
   * @returns Token client instance.
   */
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: {
      access_token?: string;
      error?: string;
      expires_in?: string | number;
    }) => void;
  }) => GoogleTokenClient;
};

/**
 * Window-level Google Identity Services bootstrap.
 */
export type GoogleIdentityWindow = {
  /**
   * GIS accounts namespace.
   */
  google?: {
    accounts?: {
      oauth2?: GoogleIdentityOauth2;
    };
  };
};

/**
 * Default OAuth scopes for Drive folder + Docs + Sheets access.
 */
export const DEFAULT_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

/**
 * Options for creating a GIS access-token provider.
 */
export type BrowserTokenProviderOptions = {
  /**
   * Public OAuth client id.
   */
  clientId: string;

  /**
   * Space-delimited OAuth scopes.
   */
  scope?: string;

  /**
   * Host window providing GIS.
   */
  host?: GoogleIdentityWindow;
};

/**
 * Create an access-token provider backed by Google Identity Services.
 *
 * @param options - Provider configuration.
 * @returns Access token provider.
 */
export function createBrowserTokenProvider(
  options: BrowserTokenProviderOptions,
): AccessTokenProvider {
  // Cache the latest token until near expiry.
  let cachedToken: string | null = null;
  let expiresAt = 0;

  /**
   * Request a fresh access token from GIS.
   *
   * @returns Access token string.
   */
  async function requestToken(): Promise<string> {
    const host = options.host ?? (globalThis as GoogleIdentityWindow);
    const oauth2 = host.google?.accounts?.oauth2;
    if (!oauth2) {
      throw new GoogleWorkspaceError("Google Identity Services is not loaded");
    }

    return new Promise((resolve, reject) => {
      const client = oauth2.initTokenClient({
        client_id: options.clientId,
        scope: options.scope ?? DEFAULT_GOOGLE_SCOPES,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(
              new GoogleWorkspaceError(
                response.error ?? "Google OAuth token request failed",
              ),
            );
            return;
          }
          cachedToken = response.access_token;
          const expiresIn = Number(response.expires_in ?? 3600);
          expiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000;
          resolve(response.access_token);
        },
      });
      client.requestAccessToken({ prompt: "" });
    });
  }

  return {
    async getAccessToken() {
      if (cachedToken && Date.now() < expiresAt) {
        return cachedToken;
      }
      return requestToken();
    },
  };
}

/**
 * Validate that a public Google OAuth client id looks present.
 *
 * @param clientId - Candidate client id.
 * @returns True when the value is non-empty.
 */
export function isValidGoogleClientId(clientId: string | undefined): boolean {
  return Boolean(clientId && clientId.trim().length > 0);
}
