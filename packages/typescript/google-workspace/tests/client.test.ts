import { describe, expect, it } from "vitest";
import type { Project } from "@roborean/spec";
import { initializeWorkspace } from "../src/binding.js";
import { createGoogleWorkspaceClient } from "../src/client.js";
import {
  documentOpsToDocsRequests,
  GOOGLE_DOCS_DRIVER_MANIFEST,
} from "../src/docsDriver.js";
import {
  ensureProjectFolder,
  ensureRoboreanFolder,
  ensureTemplatesFolder,
} from "../src/driveFolders.js";
import { GoogleWorkspaceError } from "../src/errors.js";
import { createMemoryGoogleApis } from "../src/fake/memoryApis.js";
import { TEMPLATES_FOLDER_NAME } from "../src/layout.js";

/**
 * Build a project that emits a Google Docs-compatible append op.
 *
 * @returns Project document.
 */
function appendProject(): Project {
  return {
    schemaVersion: "1.0.0",
    id: "docs-demo",
    name: "Docs demo",
    pluginRequirements: [],
    workspace: { variables: [] },
    bits: [
      {
        id: "b1",
        type: "roborean.noop",
        when: true,
        config: {},
        reads: [],
        writes: [],
        emits: [],
        effectClass: "pure",
        onError: "abort",
        capabilities: [],
      },
    ],
    documents: [],
    templates: [],
    metadata: {},
  };
}

/**
 * Build a project with a gdrive-backed Google Docs template.
 *
 * @returns Project document.
 */
function gdriveTemplateProject(): Project {
  return {
    schemaVersion: "1.1.0",
    id: "google-workspace.docs_template_demo",
    name: "Google Docs template demo",
    pluginRequirements: [],
    workspace: {
      variables: [
        {
          key: "name",
          schema: { type: "string" },
          defaultValue: {
            kind: "public_literal",
            dataType: "string",
            value: "Ada",
          },
          const: false,
          exposure: "clientVisible",
        },
      ],
    },
    bits: [
      {
        id: "fill_name",
        type: "roborean.replace_named_value",
        when: true,
        config: {
          documentId: "letter",
          name: "name",
          fromKey: "name",
        },
        reads: ["name"],
        writes: [],
        emits: ["letter"],
        effectClass: "document",
        onError: "abort",
        capabilities: [],
      },
    ],
    documents: [
      {
        id: "letter",
        title: "Letter",
        type: "docx",
        driver: "roborean.google.docs",
        templateRef: "letter_tpl",
        outputTarget: "letter.gdoc",
        irFamily: "flow",
        settings: {},
        preview: { mode: "html", enabled: true },
      },
    ],
    templates: [{ id: "letter_tpl", path: "gdrive:template-source-1" }],
    metadata: {},
  };
}

describe("google workspace client", () => {
  it("creates projects and durable dry-runs", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const client = createGoogleWorkspaceClient({ apis, binding });

    await client.createProject({ project: appendProject() });
    const listed = await client.listProjects();
    expect(listed).toHaveLength(1);

    const run = await client.createRun("docs-demo", { dryRun: true }, "idem-1");
    expect(run.status).toBe("success");
    expect(run.runId).toBeTruthy();

    const loaded = await client.getRun(run.runId);
    expect(loaded.projectId).toBe("docs-demo");
  });

  it("rejects unsupported docs operations before write", () => {
    expect(() =>
      documentOpsToDocsRequests([
        {
          documentId: "doc1",
          op: "sheet.set_cell",
        },
      ]),
    ).toThrow(GoogleWorkspaceError);
  });

  it("writes supported ops into a Google Doc on non-dry runs", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const client = createGoogleWorkspaceClient({ apis, binding });

    await client.createProject({ project: appendProject() });

    const created = await apis.drive.createDocument("Letter", "root");
    const { applyOpsToGoogleDoc } = await import("../src/docsDriver.js");
    await applyOpsToGoogleDoc(apis.docs, created.id, [
      {
        documentId: "doc1",
        op: "plain.append_text",
        text: "Hello",
      },
    ]);
    expect(apis.docsRequests.get(created.id)?.length).toBeGreaterThan(0);
  });

  it("copies gdrive templates and applies replaceAllText on runs", async () => {
    const apis = createMemoryGoogleApis();
    const binding = await initializeWorkspace(apis, "root", "Root");
    const client = createGoogleWorkspaceClient({ apis, binding });
    const project = gdriveTemplateProject();

    apis.files.set("template-source-1", {
      id: "template-source-1",
      name: "Letter template",
      mimeType: "application/vnd.google-apps.document",
      parents: ["templates-folder"],
      webViewLink: "https://docs.google.com/open?id=template-source-1",
    });

    await client.createProject({ project });
    const run = await client.createRun(
      project.id,
      { dryRun: false },
      "idem-template",
    );
    expect(run.status).toBe("success");

    const artifact = run.results?.artifacts?.[0];
    expect(artifact?.fileId).toBeTruthy();
    expect(artifact?.fileId).not.toBe("template-source-1");

    const requests = apis.docsRequests.get(artifact?.fileId ?? "") ?? [];
    expect(requests.some((request) => "replaceAllText" in request)).toBe(true);
    expect(requests.some((request) => "insertText" in request)).toBe(false);
  });

  it("ensures the templates sub-folder under a project folder", async () => {
    const apis = createMemoryGoogleApis();
    const roborean = await ensureRoboreanFolder(apis.drive, "root");
    const projectFolder = await ensureProjectFolder(
      apis.drive,
      roborean.id,
      "demo-project",
    );
    const templatesFolder = await ensureTemplatesFolder(
      apis.drive,
      projectFolder.id,
    );

    expect(templatesFolder.name).toBe(TEMPLATES_FOLDER_NAME);
    expect(templatesFolder.parents).toContain(projectFolder.id);
  });
});

describe("google docs driver manifest", () => {
  it("declares replace_named_value support", () => {
    expect(GOOGLE_DOCS_DRIVER_MANIFEST.capabilities).toContain(
      "replace_named_value",
    );
  });
});
