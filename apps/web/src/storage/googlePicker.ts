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
        setCallback: (
          cb: (data: {
            action?: string;
            docs?: Array<{ id?: string; name?: string }>;
          }) => void,
        ) => unknown;
        build: () => { setVisible: (visible: boolean) => void };
      };
      ViewId: { FOLDERS: unknown };
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
  setCallback: (
    cb: (data: {
      action?: string;
      docs?: Array<{ id?: string; name?: string }>;
    }) => void,
  ) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

/**
 * Raw optional browser API key from Vite env (may be misconfigured).
 */
const RAW_GOOGLE_API_KEY = String(
  import.meta.env.VITE_GOOGLE_API_KEY ?? "",
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
  await waitUntil(() => Boolean(host.gapi?.load));
  if (host.google?.picker) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    try {
      host.gapi!.load("picker", () => resolve());
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
  await waitUntil(() => Boolean(host.google?.picker));
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
  await loadGooglePicker();
  const host = globalThis as GoogleHost;
  const pickerApi = host.google?.picker;
  if (!pickerApi) {
    throw new Error("Google Picker failed to load");
  }

  const token = await requestGoogleAccessToken(getAccessToken);

  return new Promise((resolve, reject) => {
    // Build a folder-only picker; API key is optional but preferred.
    const builder = new pickerApi.PickerBuilder() as unknown as PickerBuilder;
    builder.addView(pickerApi.ViewId.FOLDERS).setOAuthToken(token);
    if (GOOGLE_API_KEY) {
      builder.setDeveloperKey(GOOGLE_API_KEY);
    }
    const picker = builder
      .setCallback((data) => {
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
  });
}
