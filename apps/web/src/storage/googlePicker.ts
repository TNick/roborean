import { GOOGLE_CLIENT_ID } from "../config.js";

/**
 * Window surface used for Google Identity Services and the Picker.
 */
type GoogleHost = {
  google?: {
    picker?: {
      PickerBuilder: new () => {
        addView: (view: unknown) => unknown;
        setOAuthToken: (token: string) => unknown;
        setDeveloperKey: (key: string) => unknown;
        setAppId: (appId: string) => unknown;
        setOrigin: (origin: string) => unknown;
        setCallback: (
          cb: (data: {
            action?: string;
            docs?: Array<{
              id?: string;
              name?: string;
              url?: string;
            }>;
          }) => void,
        ) => unknown;
        build: () => { setVisible: (visible: boolean) => void };
      };
      DocsView: new (viewId?: unknown) => {
        setIncludeFolders: (include: boolean) => unknown;
        setSelectFolderEnabled: (enabled: boolean) => unknown;
        setMimeTypes: (mimeTypes: string) => unknown;
      };
      ViewId: { FOLDERS: unknown; DOCS: unknown };
      Action: { PICKED: string; CANCEL: string };
    };
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: {
            access_token?: string;
            error?: string;
          }) => void;
          error_callback?: (err: { type?: string }) => void;
        }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
      };
    };
  };
  gapi?: {
    load: (api: string, callback: () => void) => void;
  };
};

/**
 * Fluent Google Picker builder methods all return the builder.
 */
type PickerBuilder = {
  addView: (view: unknown) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  setCallback: (
    cb: (data: {
      action?: string;
      docs?: Array<{ id?: string; name?: string; url?: string }>;
    }) => void,
  ) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

/**
 * Fluent DocsView helpers used for folder selection.
 */
type DocsView = {
  setIncludeFolders: (include: boolean) => DocsView;
  setSelectFolderEnabled: (enabled: boolean) => DocsView;
  setMimeTypes: (mimeTypes: string) => DocsView;
};

/**
 * Raw optional browser API key from Vite env (may be misconfigured).
 */
const RAW_GOOGLE_API_KEY = String(
  import.meta.env.VITE_GOOGLE_API_KEY ?? "",
).trim();

/**
 * Optional explicit Google Cloud project number for Picker `setAppId`.
 */
const RAW_GOOGLE_APP_ID = String(
  import.meta.env.VITE_GOOGLE_APP_ID ?? "",
).trim();

/**
 * True when `VITE_GOOGLE_API_KEY` looks like an OAuth client secret.
 *
 * Picker's `developerKey` must be an API key (often `AIza…`), never a
 * `GOCSPX-…` client secret.
 */
export const GOOGLE_API_KEY_LOOKS_LIKE_SECRET =
  /^GOCSPX-/i.test(RAW_GOOGLE_API_KEY) || /^GOCSPX_/i.test(RAW_GOOGLE_API_KEY);

/**
 * Optional browser API key used by Google Picker (`setDeveloperKey`).
 *
 * Empty when unset or when the value is clearly not an API key.
 */
export const GOOGLE_API_KEY = GOOGLE_API_KEY_LOOKS_LIKE_SECRET
  ? ""
  : RAW_GOOGLE_API_KEY;

/**
 * Drive + Docs + Sheets scopes required for workspace mode.
 */
export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

/**
 * Resolve the Google Cloud project number used as Picker app id.
 *
 * OAuth web client ids are `{projectNumber}-….apps.googleusercontent.com`.
 *
 * @param clientId - Public OAuth client id.
 * @param explicitAppId - Optional override from `VITE_GOOGLE_APP_ID`.
 * @returns Project number string, or empty when unknown.
 */
export function resolveGoogleAppId(
  clientId: string,
  explicitAppId = RAW_GOOGLE_APP_ID,
): string {
  if (/^\d+$/.test(explicitAppId)) {
    return explicitAppId;
  }

  // Accept an OAuth client id in the override and normalize it to the project
  // number. This is a common configuration mistake because Google calls both
  // values an app/client id in different consoles.
  const explicitPrefix = explicitAppId.split("-")[0] ?? "";
  if (/^\d+$/.test(explicitPrefix)) {
    return explicitPrefix;
  }

  const prefix = clientId.split("-")[0] ?? "";
  return /^\d+$/.test(prefix) ? prefix : "";
}

/**
 * Write redacted Picker state to the browser console for deployment support.
 *
 * OAuth tokens and the complete API key are deliberately excluded. The API
 * key suffix is enough to identify which Google Cloud credential was bundled.
 *
 * @param stage - Picker lifecycle stage being reported.
 * @param details - Additional non-secret state for this stage.
 */
export function logGooglePickerDiagnostics(
  stage: string,
  details: Record<string, unknown> = {},
): void {
  // Derive identifiers that can be compared with Google Cloud configuration.
  const clientProjectNumber = resolveGoogleAppId(GOOGLE_CLIENT_ID, "");
  const appId = resolveGoogleAppId(GOOGLE_CLIENT_ID);
  const apiKeySuffix = GOOGLE_API_KEY
    ? GOOGLE_API_KEY.slice(-4)
    : "not-configured";
  const host = globalThis as GoogleHost;

  // Keep the diagnostic as one expandable object for easy copying from
  // DevTools without ever printing credentials or access tokens.
  console.info(`[Roborean Google Picker] ${stage}`, {
    origin: globalThis.location?.origin ?? "unavailable",
    referrer: globalThis.document?.referrer || "none",
    secureContext: globalThis.isSecureContext,
    apiKeyConfigured: Boolean(GOOGLE_API_KEY),
    apiKeyLooksLikeGoogleKey: /^AIza[\w-]{35}$/.test(GOOGLE_API_KEY),
    apiKeyLength: GOOGLE_API_KEY.length,
    apiKeySuffix,
    appId,
    configuredAppId: RAW_GOOGLE_APP_ID || "derived",
    clientProjectNumber,
    appIdMatchesClientProject: Boolean(
      appId && clientProjectNumber && appId === clientProjectNumber,
    ),
    gapiLoaded: Boolean(host.gapi?.load),
    pickerLoaded: Boolean(host.google?.picker),
    identityLoaded: Boolean(host.google?.accounts?.oauth2),
    ...details,
  });
}

/**
 * Ensure Google Picker dialogs stack above the folder-gate overlay.
 */
function ensurePickerStackingCss(): void {
  const styleId = "roborean-google-picker-zindex";
  if (document.getElementById(styleId)) {
    return;
  }
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
.picker-dialog-bg {
  z-index: 20000 !important;
}
.picker-dialog {
  z-index: 20001 !important;
}
`;
  document.head.appendChild(style);
}

/**
 * Wait until a predicate becomes true or the timeout elapses.
 *
 * @param isReady - Readiness check.
 * @param timeoutMs - Maximum wait time.
 * @returns Promise that resolves when ready.
 */
async function waitUntil(
  isReady: () => boolean,
  timeoutMs = 15_000,
): Promise<void> {
  const started = Date.now();
  while (!isReady()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for Google client libraries");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Ensure Google Identity Services is available on the page.
 *
 * @returns GIS oauth2 namespace.
 */
export async function loadGoogleIdentity(): Promise<
  NonNullable<NonNullable<GoogleHost["google"]>["accounts"]>["oauth2"]
> {
  const host = globalThis as GoogleHost;
  await waitUntil(() => Boolean(host.google?.accounts?.oauth2));
  return host.google!.accounts!.oauth2!;
}

/**
 * Load the Google Picker API via gapi.
 */
export async function loadGooglePicker(): Promise<void> {
  const host = globalThis as GoogleHost;
  logGooglePickerDiagnostics("waiting for gapi");
  await waitUntil(() => Boolean(host.gapi?.load));
  if (host.google?.picker) {
    logGooglePickerDiagnostics("Picker already loaded");
    return;
  }
  await new Promise<void>((resolve, reject) => {
    try {
      // Load only Picker. Loading gapi's legacy auth-aware client alongside
      // Google Identity Services can render a second, unauthenticated sign-in
      // surface inside the Picker iframe.
      host.gapi!.load("picker", () => resolve());
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
  await waitUntil(() => Boolean(host.google?.picker));
  logGooglePickerDiagnostics("Picker module loaded");
}

/**
 * Request an OAuth access token with Google Identity Services.
 *
 * Prefer the shared workspace session token when available so the folder
 * gate does not open a second OAuth prompt.
 *
 * @param getAccessToken - Optional shared token getter from WorkspaceProvider.
 * @param scope - Space-delimited OAuth scopes when using GIS directly.
 * @returns Access token string.
 */
export async function requestGoogleAccessToken(
  getAccessToken?: () => Promise<string>,
  scope = GOOGLE_WORKSPACE_SCOPES,
): Promise<string> {
  if (getAccessToken) {
    return getAccessToken();
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  }
  const oauth2 = await loadGoogleIdentity();
  if (!oauth2) {
    throw new Error("Google Identity Services is not loaded");
  }
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope,
      callback: (response) => {
        if (!response.access_token) {
          reject(new Error(response.error ?? "Google OAuth failed"));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (err) => {
        reject(new Error(err?.type ?? "Google OAuth popup failed"));
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

/**
 * Open the Drive folder picker and return the selected folder.
 *
 * @param getAccessToken - Optional shared token getter from WorkspaceProvider.
 * @returns Selected folder id and name.
 */
export async function pickDriveFolder(
  getAccessToken?: () => Promise<string>,
): Promise<{
  id: string;
  name: string;
}> {
  if (!GOOGLE_API_KEY) {
    throw new Error(
      GOOGLE_API_KEY_LOOKS_LIKE_SECRET
        ? "VITE_GOOGLE_API_KEY looks like an OAuth client secret; use an API key (AIza…)"
        : "VITE_GOOGLE_API_KEY is required for Google Picker",
    );
  }

  ensurePickerStackingCss();
  logGooglePickerDiagnostics("folder picker requested");
  await loadGooglePicker();
  const host = globalThis as GoogleHost;
  const pickerApi = host.google?.picker;
  if (!pickerApi) {
    throw new Error("Google Picker failed to load");
  }

  const token = await requestGoogleAccessToken(getAccessToken);
  const appId = resolveGoogleAppId(GOOGLE_CLIENT_ID);
  const origin = `${window.location.protocol}//${window.location.host}`;
  logGooglePickerDiagnostics("OAuth token acquired", {
    appIdApplied: Boolean(appId),
    sharedTokenProvider: Boolean(getAccessToken),
  });

  return new Promise((resolve, reject) => {
    // Folder view must explicitly allow selecting folders (not only opening them).
    const folderView = new pickerApi.DocsView(
      pickerApi.ViewId.FOLDERS,
    ) as unknown as DocsView;
    folderView.setSelectFolderEnabled(true);

    let builder = new pickerApi.PickerBuilder() as unknown as PickerBuilder;
    builder = builder
      .addView(folderView)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOrigin(origin);

    if (appId) {
      builder = builder.setAppId(appId);
    }

    const picker = builder
      .setCallback((data) => {
        logGooglePickerDiagnostics("folder picker callback", {
          action: data.action ?? "missing",
          selectedDocumentCount: data.docs?.length ?? 0,
        });
        if (data.action === pickerApi.Action.PICKED) {
          const doc = data.docs?.[0];
          if (!doc?.id) {
            reject(new Error("No folder selected"));
            return;
          }
          resolve({
            id: doc.id,
            name: doc.name ?? "Roborean folder",
          });
          return;
        }
        if (
          data.action === pickerApi.Action.CANCEL ||
          data.action === "cancel"
        ) {
          reject(new Error("Folder selection cancelled"));
        }
      })
      .build();
    picker.setVisible(true);
    logGooglePickerDiagnostics("folder picker made visible");

    // Belt-and-suspenders: raise z-index on any dialog nodes Google just added.
    for (const node of document.querySelectorAll<HTMLElement>(
      ".picker-dialog, .picker-dialog-bg",
    )) {
      node.style.zIndex = node.classList.contains("picker-dialog-bg")
        ? "20000"
        : "20001";
    }
  });
}

/**
 * Open the Drive file picker and return a selected Google Doc.
 *
 * @param getAccessToken - Optional shared token getter from WorkspaceProvider.
 * @returns Selected document id, name, and web view link.
 */
export async function pickDriveFile(
  getAccessToken?: () => Promise<string>,
): Promise<{
  id: string;
  name: string;
  webViewLink?: string;
}> {
  if (!GOOGLE_API_KEY) {
    throw new Error(
      GOOGLE_API_KEY_LOOKS_LIKE_SECRET
        ? "VITE_GOOGLE_API_KEY looks like an OAuth client secret; use an API key (AIza…)"
        : "VITE_GOOGLE_API_KEY is required for Google Picker",
    );
  }

  ensurePickerStackingCss();
  await loadGooglePicker();
  const host = globalThis as GoogleHost;
  const pickerApi = host.google?.picker;
  if (!pickerApi) {
    throw new Error("Google Picker failed to load");
  }

  const token = await requestGoogleAccessToken(getAccessToken);
  const appId = resolveGoogleAppId(GOOGLE_CLIENT_ID);
  const origin = `${window.location.protocol}//${window.location.host}`;

  return new Promise((resolve, reject) => {
    const docsView = new pickerApi.DocsView(
      pickerApi.ViewId.DOCS,
    ) as unknown as DocsView;
    docsView.setIncludeFolders(false);
    docsView.setSelectFolderEnabled(false);
    docsView.setMimeTypes("application/vnd.google-apps.document");

    let builder = new pickerApi.PickerBuilder() as unknown as PickerBuilder;
    builder = builder
      .addView(docsView)
      .setOAuthToken(token)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setOrigin(origin);

    if (appId) {
      builder = builder.setAppId(appId);
    }

    const picker = builder
      .setCallback((data) => {
        if (data.action === pickerApi.Action.PICKED) {
          const doc = data.docs?.[0];
          if (!doc?.id) {
            reject(new Error("No document selected"));
            return;
          }
          resolve({
            id: doc.id,
            name: doc.name ?? "Google Doc template",
            webViewLink: doc.url,
          });
          return;
        }
        if (
          data.action === pickerApi.Action.CANCEL ||
          data.action === "cancel"
        ) {
          reject(new Error("Document selection cancelled"));
        }
      })
      .build();
    picker.setVisible(true);

    for (const node of document.querySelectorAll<HTMLElement>(
      ".picker-dialog, .picker-dialog-bg",
    )) {
      node.style.zIndex = node.classList.contains("picker-dialog-bg")
        ? "20000"
        : "20001";
    }
  });
}
