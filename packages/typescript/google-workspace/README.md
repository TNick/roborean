# `@roborean/google-workspace`

Browser-only Google Workspace storage and document adapter for Roborean.

## Role

- OAuth via Google Identity Services (public client ID only)
- Required user-selected Drive root folder
- Companion Google Sheet as the structured store
- Native Google Docs as generated document outputs
- Fake/in-memory implementations for unit tests

## Usage

```ts
import {
  createGoogleWorkspaceClient,
  createMemoryGoogleApis,
} from "@roborean/google-workspace";

const apis = createMemoryGoogleApis();
const client = createGoogleWorkspaceClient({
  apis,
  binding: {
    rootFolderId: "folder-1",
    rootFolderName: "Roborean",
    spreadsheetId: "sheet-1",
    schemaVersion: 1,
  },
});
```

Never embed a Google client secret in browser bundles.
