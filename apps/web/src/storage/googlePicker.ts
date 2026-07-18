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
 * Optional browser API key used by Google Picker (`setDeveloperKey`).
 */
export const GOOGLE_API_KEY = String(
  import.meta.env.VITE_GOOGLE_API_KEY ?? "",
).trim();

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
 * @param scope - Space-delimited OAuth scopes.
 * @returns Access token string.
 */
export async function requestGoogleAccessToken(
  scope = GOOGLE_WORKSPACE_SCOPES,
): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  }
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
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

/**
 * Open the Drive folder picker and return the selected folder.
 *
 * @returns Selected folder id and name.
 */
export async function pickDriveFolder(): Promise<{
  id: string;
  name: string;
}> {
  await loadGooglePicker();
  const host = globalThis as GoogleHost;
  const pickerApi = host.google?.picker;
  if (!pickerApi) {
    throw new Error("Google Picker failed to load");
  }

  const token = await requestGoogleAccessToken();

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

/**
 * Create a new Drive folder at My Drive root using the Drive API.
 *
 * @param name - Folder display name.
 * @returns Created folder id and name.
 */
export async function createDriveFolder(name: string): Promise<{
  id: string;
  name: string;
}> {
  const token = await requestGoogleAccessToken();
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: ["root"],
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  const raw = (await response.json()) as { id?: string; name?: string };
  if (!raw.id) {
    throw new Error("Drive did not return a folder id");
  }
  return { id: raw.id, name: raw.name ?? name };
}
