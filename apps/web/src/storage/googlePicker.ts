import { GOOGLE_CLIENT_ID } from "../config.js";
import { openGooglePickerWithReact } from "./googlePickerBridge.js";

type GoogleHost = {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: {
            access_token?: string;
            error?: string;
          }) => void;
          error_callback: (error: { type?: string }) => void;
        }) => { requestAccessToken: (options?: { prompt?: string }) => void };
      };
    };
  };
};

const RAW_GOOGLE_API_KEY = String(
  import.meta.env.VITE_GOOGLE_API_KEY ?? "",
).trim();
const RAW_GOOGLE_APP_ID = String(
  import.meta.env.VITE_GOOGLE_APP_ID ?? "",
).trim();

export const GOOGLE_API_KEY_LOOKS_LIKE_SECRET =
  /^GOCSPX-/i.test(RAW_GOOGLE_API_KEY) || /^GOCSPX_/i.test(RAW_GOOGLE_API_KEY);
export const GOOGLE_API_KEY = GOOGLE_API_KEY_LOOKS_LIKE_SECRET
  ? ""
  : RAW_GOOGLE_API_KEY;
export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

let hasRequestedGoogleConsent = false;

/** Resolve the Picker app id from public Google Cloud configuration. */
export function resolveGoogleAppId(
  clientId: string,
  explicitAppId = RAW_GOOGLE_APP_ID,
): string {
  if (/^\d+$/.test(explicitAppId)) return explicitAppId;
  const explicitPrefix = explicitAppId.split("-")[0] ?? "";
  if (/^\d+$/.test(explicitPrefix)) return explicitPrefix;
  const clientPrefix = clientId.split("-")[0] ?? "";
  return /^\d+$/.test(clientPrefix) ? clientPrefix : "";
}

/** Write redacted Picker deployment diagnostics to the browser console. */
export function logGooglePickerDiagnostics(
  stage: string,
  details: Record<string, unknown> = {},
): void {
  const origin = globalThis.location?.origin ?? "unavailable";
  const host = globalThis as GoogleHost;
  const clientProjectNumber = resolveGoogleAppId(GOOGLE_CLIENT_ID, "");
  const appId = resolveGoogleAppId(GOOGLE_CLIENT_ID);
  console.info(`[Roborean Google Picker] ${stage}`, {
    origin,
    pagePath: globalThis.location?.pathname ?? "unavailable",
    inboundDocumentReferrer: globalThis.document?.referrer || "none",
    outboundHttpRefererInspectableInNetworkPanel: true,
    browserRestrictionCandidates:
      origin === "unavailable" ? [] : [origin, `${origin}/*`],
    secureContext: globalThis.isSecureContext,
    apiKeyConfigured: Boolean(GOOGLE_API_KEY),
    apiKeyLooksLikeGoogleKey: /^AIza[\w-]{35}$/.test(GOOGLE_API_KEY),
    apiKeyLength: GOOGLE_API_KEY.length,
    apiKeySuffix: GOOGLE_API_KEY ? GOOGLE_API_KEY.slice(-4) : "not-configured",
    appId,
    configuredAppId: RAW_GOOGLE_APP_ID || "derived",
    clientProjectNumber,
    appIdMatchesClientProject: Boolean(
      appId && clientProjectNumber && appId === clientProjectNumber,
    ),
    identityLoaded: Boolean(host.google?.accounts?.oauth2),
    ...details,
  });
}

/** Probe Drive OAuth acceptance without conflating it with Picker API-key validity. */
export async function probeGoogleOAuthToken(token: string): Promise<void> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("fields", "files(id)");
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    logGooglePickerDiagnostics("OAuth token probe completed", {
      driveApiAcceptedOAuthToken: response.ok,
      driveApiStatus: response.status,
      oauthProbeMeaning: response.ok
        ? "Drive accepted the OAuth token; this does not validate the Picker API key"
        : "Drive rejected the OAuth token or the Drive request",
    });
  } catch (error) {
    logGooglePickerDiagnostics("OAuth token probe unavailable", {
      probeErrorType: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Wait for the static Google Identity Services script to become available. */
async function loadGoogleIdentity(): Promise<
  NonNullable<NonNullable<GoogleHost["google"]>["accounts"]>["oauth2"]
> {
  const started = Date.now();
  const host = globalThis as GoogleHost;
  while (!host.google?.accounts?.oauth2) {
    if (Date.now() - started > 15_000)
      throw new Error("Timed out waiting for Google Identity Services");
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return host.google.accounts.oauth2!;
}

/** Request a shared workspace token, or use GIS with first-request consent. */
export async function requestGoogleAccessToken(
  getAccessToken?: () => Promise<string>,
  scope = GOOGLE_WORKSPACE_SCOPES,
): Promise<string> {
  if (getAccessToken) return getAccessToken();
  if (!GOOGLE_CLIENT_ID) throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  const oauth2 = await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(response.error ?? "Google OAuth failed"));
          return;
        }
        hasRequestedGoogleConsent = true;
        resolve(response.access_token);
      },
      error_callback: (error) =>
        reject(new Error(error.type ?? "Google OAuth popup failed")),
    });
    client.requestAccessToken({
      prompt: hasRequestedGoogleConsent ? "" : "consent",
    });
  });
}

/** Validate the Picker API-key configuration before mounting the dialog. */
function validatePickerConfiguration(): void {
  if (GOOGLE_API_KEY) return;
  throw new Error(
    GOOGLE_API_KEY_LOOKS_LIKE_SECRET
      ? "VITE_GOOGLE_API_KEY looks like an OAuth client secret; use an API key (AIza…)"
      : "VITE_GOOGLE_API_KEY is required for Google Picker",
  );
}

/** Open the Drive folder picker with the official React wrapper. */
export async function pickDriveFolder(
  getAccessToken?: () => Promise<string>,
): Promise<{ id: string; name: string }> {
  validatePickerConfiguration();
  const token = await requestGoogleAccessToken(getAccessToken);
  void probeGoogleOAuthToken(token);
  const selected = await openGooglePickerWithReact({
    kind: "folder",
    oauthToken: token,
    developerKey: GOOGLE_API_KEY,
    appId: resolveGoogleAppId(GOOGLE_CLIENT_ID),
    origin: window.location.origin,
    onDiagnostic: logGooglePickerDiagnostics,
  });
  return { id: selected.id, name: selected.name };
}

/** Open the Google Docs picker with the official React wrapper. */
export async function pickDriveFile(
  getAccessToken?: () => Promise<string>,
): Promise<{ id: string; name: string; webViewLink?: string }> {
  validatePickerConfiguration();
  const token = await requestGoogleAccessToken(getAccessToken);
  void probeGoogleOAuthToken(token);
  return openGooglePickerWithReact({
    kind: "google-document",
    oauthToken: token,
    developerKey: GOOGLE_API_KEY,
    appId: resolveGoogleAppId(GOOGLE_CLIENT_ID),
    origin: window.location.origin,
    onDiagnostic: logGooglePickerDiagnostics,
  });
}
