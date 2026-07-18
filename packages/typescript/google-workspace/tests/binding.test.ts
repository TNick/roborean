import { describe, expect, it } from "vitest";
import {
  clearBinding,
  initializeWorkspace,
  loadBinding,
  saveBinding,
  validateBinding,
} from "../src/binding.js";
import { createMemoryGoogleApis } from "../src/fake/memoryApis.js";
import {
  DATA_SHEET_NAME,
  ROBOREAN_FOLDER_NAME,
  WORKSPACE_SCHEMA_VERSION,
} from "../src/layout.js";

describe("workspace binding", () => {
  it("round-trips binding metadata through storage", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    saveBinding(
      {
        rootFolderId: "root",
        rootFolderName: "Root",
        spreadsheetId: "sheet",
        schemaVersion: 1,
      },
      adapter,
    );

    expect(loadBinding(adapter)?.spreadsheetId).toBe("sheet");
    clearBinding(adapter);
    expect(loadBinding(adapter)).toBeNull();
  });

  it("initializes Roborean folder and companion sheet", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");

    expect(binding.rootFolderId).toBe("root");
    expect(binding.schemaVersion).toBe(WORKSPACE_SCHEMA_VERSION);

    const roborean = await apis.drive.findChild(
      "root",
      ROBOREAN_FOLDER_NAME,
      "application/vnd.google-apps.folder",
    );
    expect(roborean).not.toBeNull();

    const sheet = await apis.drive.findChild(
      roborean!.id,
      DATA_SHEET_NAME,
      "application/vnd.google-apps.spreadsheet",
    );
    expect(sheet?.id).toBe(binding.spreadsheetId);

    const validated = await validateBinding(apis, binding);
    expect(validated.connectedAt).toBeTruthy();
  });
});
