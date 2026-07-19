# `@roborean/google-workspace`

Browser-only Google Workspace storage and document adapter for Roborean.

## Role

- OAuth via Google Identity Services (public client ID only)
- Required user-selected Drive root folder
- Companion Google Sheet as the structured store
- Native Google Docs as generated document outputs
- Fake/in-memory implementations for unit tests

## Google Doc templates

Projects can reference hand-authored Google Doc templates using the
`gdrive:{fileId}` convention in `project.templates[].path`. During a run,
the client copies the linked template into the project folder and applies
`replaceAllText` / end-of-document `insertText` requests so native Docs
formatting survives placeholder substitution.

Template Docs created from the editor live under
`Roborean/project-{id}/templates/`. Documents without a `gdrive:` template
keep the legacy blank-doc plus flattened plain-text insert path.

## Usage

```ts
import {
  createGoogleWorkspaceClient,
  createMemoryGoogleApis,
  gdriveTemplatePath,
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

const templatePath = gdriveTemplatePath("abc123");
```

Never embed a Google client secret in browser bundles.

## In-app preview

The editor Preview panel dry-runs document bits locally for Google Docs
documents and applies `applyOpsToPlainText` against exported `gdrive:`
template text (via Drive `files.export`) or cached inline template bodies.
Run detail pages can expand a read-only `/preview` iframe for generated
artifacts; full editing remains on `docs.google.com`.

## Google Docs template catalog

Google-only deployments include a small browser catalog of Google Docs seeds.
Importing a seed creates a real document inside the project `templates/` folder
and saves only its `gdrive:{fileId}` reference in the project. The internal
`gdrive-seed:` token is catalog-only and is never persisted in user projects.
