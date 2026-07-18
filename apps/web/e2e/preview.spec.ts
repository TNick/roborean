import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";
import type { Project } from "@roborean/spec";

import {
  expectPreviewBody,
  openProjects,
  openProjectFromList,
  openTemplatesLibrary,
  runDryRun,
  selectDocument,
  useProjectStarter,
} from "./helpers/ui.js";

const apiBase = process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:18080";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

/**
 * Load a JSON fixture from the repository root.
 *
 * @param relativePath - Path relative to the repo root.
 * @returns Parsed JSON value.
 */
function loadJson(relativePath: string): unknown {
  const full = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

test.describe("Document preview", () => {
  test("Set and copy starter shows guidance before dry-run", async ({
    page,
  }) => {
    await openTemplatesLibrary(page);
    await useProjectStarter(page, "set-and-copy");
    await expect(
      page.getByText("Run dry-run after adding document bits to preview."),
    ).toBeVisible();
  });

  test("public example project renders preview after dry-run when seeded via API", async ({
    page,
    request,
  }) => {
    const base = loadJson(
      "apps/web/public/examples/02_set_and_copy.json",
    ) as Project;
    const project: Project = {
      ...base,
      id: `preview.set-and-copy.${crypto.randomUUID().slice(0, 8)}`,
    };

    const createResponse = await request.post(`${apiBase}/v1/projects`, {
      data: { project },
    });
    expect(createResponse.ok()).toBeTruthy();

    const templateResponse = await request.put(
      `${apiBase}/v1/projects/${project.id}/templates/title/content`,
      {
        data: { text: "Title: {{title}}\n" },
      },
    );
    expect(templateResponse.ok()).toBeTruthy();
    for (const [templateId, text] of [
      ["copy", "Copied title: {{title_copy}}\n"],
      [
        "summary",
        "Workspace record\nTitle: {{title}}\nCopy: {{title_copy}}\nItems: {{item_count}}\nEnabled: {{enabled}}\nDue: {{due_date}}\nPriority: {{priority}}\nScore: {{score}}\n",
      ],
    ] as const) {
      const uploaded = await request.put(
        `${apiBase}/v1/projects/${project.id}/templates/${templateId}/content`,
        { data: { text } },
      );
      expect(uploaded.ok()).toBeTruthy();
    }

    const templateLoaded = page.waitForResponse(
      (response) =>
        response.url().includes("/templates/title/content") && response.ok(),
    );
    await openProjects(page);
    await openProjectFromList(page, project.id);
    await templateLoaded;
    await runDryRun(page);
    await expectPreviewBody(page, "Title: World");
  });

  test("selecting a document keeps preview panel visible after dry-run", async ({
    page,
  }) => {
    await openTemplatesLibrary(page);
    await useProjectStarter(page, "set-and-copy");
    await selectDocument(page, "Title");
    await runDryRun(page);
    await expect(page.getByTestId("preview-panel")).toBeVisible();
    await expectPreviewBody(page, "Title: World");
  });
});
