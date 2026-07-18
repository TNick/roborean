import { GoogleWorkspaceError, NotFoundError } from "./errors.js";
import type {
  AccessTokenProvider,
  DocsApi,
  DriveApi,
  DriveFile,
  GoogleApis,
  SheetsApi,
} from "./types.js";

/**
 * Options for live Google REST clients.
 */
export type LiveGoogleApisOptions = {
  /**
   * Token provider for Authorization headers.
   */
  tokens: AccessTokenProvider;

  /**
   * Optional fetch implementation.
   */
  fetchImpl?: typeof fetch;
};

/**
 * Create Drive/Docs/Sheets clients against Google REST APIs.
 *
 * @param options - Live client options.
 * @returns Google API suite.
 */
export function createLiveGoogleApis(
  options: LiveGoogleApisOptions,
): GoogleApis {
  const fetchImpl = options.fetchImpl ?? fetch;

  /**
   * Perform an authenticated JSON Google API request.
   *
   * @param url - Absolute request URL.
   * @param init - Fetch init options.
   * @returns Parsed JSON body, or undefined for empty responses.
   */
  async function googleFetch<T>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.tokens.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetchImpl(url, { ...init, headers });
    if (response.status === 404) {
      throw new NotFoundError(url);
    }
    if (!response.ok) {
      throw new GoogleWorkspaceError(
        `${response.status} ${await response.text()}`,
      );
    }
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  /**
   * Map a Drive files resource into DriveFile.
   *
   * @param raw - Drive API file resource.
   * @returns Normalized DriveFile.
   */
  function mapFile(raw: {
    id?: string;
    name?: string;
    mimeType?: string;
    parents?: string[];
    webViewLink?: string;
  }): DriveFile {
    return {
      id: raw.id ?? "",
      name: raw.name ?? "",
      mimeType: raw.mimeType ?? "",
      parents: raw.parents ?? [],
      webViewLink: raw.webViewLink,
    };
  }

  /**
   * Create a Drive file with metadata-only multipart-free create.
   *
   * @param name - File name.
   * @param mimeType - MIME type.
   * @param parentId - Parent folder id.
   * @returns Created file.
   */
  async function createDriveFile(
    name: string,
    mimeType: string,
    parentId: string,
  ): Promise<DriveFile> {
    const raw = await googleFetch<{
      id?: string;
      name?: string;
      mimeType?: string;
      parents?: string[];
      webViewLink?: string;
    }>(
      "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,webViewLink",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          mimeType,
          parents: [parentId],
        }),
      },
    );
    return mapFile(raw);
  }

  const drive: DriveApi = {
    createFolder: (name, parentId) =>
      createDriveFile(name, "application/vnd.google-apps.folder", parentId),
    createSpreadsheet: (name, parentId) =>
      createDriveFile(
        name,
        "application/vnd.google-apps.spreadsheet",
        parentId,
      ),
    createDocument: (name, parentId) =>
      createDriveFile(name, "application/vnd.google-apps.document", parentId),
    async copyFile(fileId, name, parentId) {
      const raw = await googleFetch<{
        id?: string;
        name?: string;
        mimeType?: string;
        parents?: string[];
        webViewLink?: string;
      }>(
        `https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,name,mimeType,parents,webViewLink`,
        {
          method: "POST",
          body: JSON.stringify({
            name,
            parents: [parentId],
          }),
        },
      );
      return mapFile(raw);
    },
    async findChild(parentId, name, mimeType) {
      const escapedName = name.replace(/'/g, "\\'");
      const clauses = [
        `'${parentId}' in parents`,
        `name = '${escapedName}'`,
        "trashed = false",
      ];
      if (mimeType) {
        clauses.push(`mimeType = '${mimeType}'`);
      }
      const query = encodeURIComponent(clauses.join(" and "));
      const raw = await googleFetch<{
        files?: Array<{
          id?: string;
          name?: string;
          mimeType?: string;
          parents?: string[];
          webViewLink?: string;
        }>;
      }>(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,parents,webViewLink)&pageSize=1`,
      );
      const first = raw.files?.[0];
      return first ? mapFile(first) : null;
    },
    async getFile(fileId) {
      const raw = await googleFetch<{
        id?: string;
        name?: string;
        mimeType?: string;
        parents?: string[];
        webViewLink?: string;
      }>(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,parents,webViewLink`,
      );
      return mapFile(raw);
    },
    async deleteFile(fileId) {
      await googleFetch<void>(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        { method: "DELETE" },
      );
    },
  };

  const sheets: SheetsApi = {
    async ensureTabs(spreadsheetId, tabNames) {
      const meta = await googleFetch<{
        sheets?: Array<{ properties?: { title?: string; sheetId?: number } }>;
      }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      );
      const existing = new Set(
        (meta.sheets ?? [])
          .map((sheet) => sheet.properties?.title)
          .filter((title): title is string => Boolean(title)),
      );
      const requests = tabNames
        .filter((tabName) => !existing.has(tabName))
        .map((title) => ({ addSheet: { properties: { title } } }));
      if (requests.length === 0) {
        return;
      }
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({ requests }),
        },
      );
    },
    async readRows(spreadsheetId, tabName) {
      const raw = await googleFetch<{ values?: string[][] }>(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}`,
      );
      return raw.values ?? [];
    },
    async writeRows(spreadsheetId, tabName, rows) {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({ values: rows }),
        },
      );
    },
  };

  const docs: DocsApi = {
    async batchUpdate(documentId, requests) {
      await googleFetch(
        `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({ requests }),
        },
      );
    },
  };

  return { drive, sheets, docs };
}
