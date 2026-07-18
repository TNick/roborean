import { NotFoundError } from "../errors.js";
import { SHEET_HEADERS, SHEET_TABS } from "../layout.js";
import type {
  DocsApi,
  DriveApi,
  DriveFile,
  GoogleApis,
  SheetsApi,
} from "../types.js";

/**
 * In-memory Google API fake for unit tests.
 */
export type MemoryGoogleApis = GoogleApis & {
  /**
   * Mutable Drive file table.
   */
  files: Map<string, DriveFile & { content?: string }>;

  /**
   * Mutable sheet tab table keyed by spreadsheetId/tabName.
   */
  sheetsData: Map<string, Map<string, string[][]>>;

  /**
   * Docs batchUpdate request log keyed by document id.
   */
  docsRequests: Map<string, Array<Record<string, unknown>>>;
};

/**
 * Create an in-memory Google API suite for tests.
 *
 * @returns Fake Google API clients plus inspectable state.
 */
export function createMemoryGoogleApis(): MemoryGoogleApis {
  // Shared mutable tables for Drive, Sheets, and Docs fakes.
  const files = new Map<string, DriveFile & { content?: string }>();
  const sheetsData = new Map<string, Map<string, string[][]>>();
  const docsRequests = new Map<string, Array<Record<string, unknown>>>();
  let nextId = 1;

  /**
   * Allocate a deterministic fake Drive id.
   *
   * @returns Fake file id.
   */
  function allocateId(): string {
    const id = `file-${nextId}`;
    nextId += 1;
    return id;
  }

  /**
   * Create a Drive file row.
   *
   * @param name - File name.
   * @param mimeType - MIME type.
   * @param parentId - Parent folder id.
   * @returns Created file metadata.
   */
  function createFile(
    name: string,
    mimeType: string,
    parentId: string,
  ): DriveFile {
    const id = allocateId();
    const file: DriveFile = {
      id,
      name,
      mimeType,
      parents: [parentId],
      webViewLink: `https://docs.google.com/open?id=${id}`,
    };
    files.set(id, file);
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      sheetsData.set(id, new Map());
    }
    return file;
  }

  const drive: DriveApi = {
    async createFolder(name, parentId) {
      return createFile(name, "application/vnd.google-apps.folder", parentId);
    },
    async createSpreadsheet(name, parentId) {
      return createFile(
        name,
        "application/vnd.google-apps.spreadsheet",
        parentId,
      );
    },
    async createDocument(name, parentId) {
      return createFile(name, "application/vnd.google-apps.document", parentId);
    },
    async findChild(parentId, name, mimeType) {
      for (const file of files.values()) {
        if (
          file.parents.includes(parentId) &&
          file.name === name &&
          (!mimeType || file.mimeType === mimeType)
        ) {
          return file;
        }
      }
      return null;
    },
    async getFile(fileId) {
      const file = files.get(fileId);
      if (!file) {
        throw new NotFoundError(fileId);
      }
      return file;
    },
    async deleteFile(fileId) {
      if (!files.delete(fileId)) {
        throw new NotFoundError(fileId);
      }
    },
  };

  const sheets: SheetsApi = {
    async ensureTabs(spreadsheetId, tabNames) {
      let tabs = sheetsData.get(spreadsheetId);
      if (!tabs) {
        tabs = new Map();
        sheetsData.set(spreadsheetId, tabs);
      }
      for (const tabName of tabNames) {
        if (!tabs.has(tabName)) {
          const headers = SHEET_HEADERS[
            tabName as keyof typeof SHEET_HEADERS
          ] ?? ["value"];
          tabs.set(tabName, [headers]);
        }
      }
    },
    async readRows(spreadsheetId, tabName) {
      const tabs = sheetsData.get(spreadsheetId);
      if (!tabs) {
        throw new NotFoundError(spreadsheetId);
      }
      return structuredClone(tabs.get(tabName) ?? [[]]);
    },
    async writeRows(spreadsheetId, tabName, rows) {
      let tabs = sheetsData.get(spreadsheetId);
      if (!tabs) {
        tabs = new Map();
        sheetsData.set(spreadsheetId, tabs);
      }
      tabs.set(tabName, structuredClone(rows));
    },
  };

  const docs: DocsApi = {
    async batchUpdate(documentId, requests) {
      if (!files.has(documentId)) {
        throw new NotFoundError(documentId);
      }
      const existing = docsRequests.get(documentId) ?? [];
      existing.push(...requests);
      docsRequests.set(documentId, existing);
    },
  };

  // Seed a root folder so tests can bind immediately.
  files.set("root", {
    id: "root",
    name: "Root",
    mimeType: "application/vnd.google-apps.folder",
    parents: [],
  });

  return {
    drive,
    sheets,
    docs,
    files,
    sheetsData,
    docsRequests,
  };
}

/**
 * Ensure required tabs exist for a memory spreadsheet.
 *
 * @param apis - Memory Google APIs.
 * @param spreadsheetId - Spreadsheet id.
 */
export async function seedMemorySheetSchema(
  apis: MemoryGoogleApis,
  spreadsheetId: string,
): Promise<void> {
  await apis.sheets.ensureTabs(spreadsheetId, Object.values(SHEET_TABS));
}
