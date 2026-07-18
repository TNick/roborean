import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";
import type { Project } from "@roborean/spec";

import { openProjects, openProjectFromList, runDryRun } from "./helpers/ui.js";

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

test.describe("Projects list", () => {
  test("creates a blank API project from the dialog", async ({ page }) => {
    await openProjects(page);
    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("E2E blank");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page).toHaveURL(/#\/projects\/api\/.+/);
    await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
  });

  test("shows API storage source labels in the list", async ({
    page,
    request,
  }) => {
    const project = loadJson(
      "conformance/projects/02_set_and_copy.json",
    ) as Project;

    const createResponse = await request.post(`${apiBase}/v1/projects`, {
      data: { project },
    });
    expect(createResponse.ok()).toBeTruthy();

    await openProjects(page);
    await expect(page.getByText("API · example.set-and-copy")).toBeVisible();
  });

  test("opens seeded workspace project and dry-run succeeds", async ({
    page,
    request,
  }) => {
    const project = loadJson(
      "conformance/projects/02_set_and_copy.json",
    ) as Project;

    const createResponse = await request.post(`${apiBase}/v1/projects`, {
      data: { project },
    });
    expect(createResponse.ok()).toBeTruthy();

    await openProjects(page);
    await openProjectFromList(page, "example.set-and-copy");
    await runDryRun(page);
  });

  test("deletes a project from the list", async ({ page, request }) => {
    const base = loadJson(
      "conformance/projects/02_set_and_copy.json",
    ) as Project;
    const project: Project = {
      ...base,
      id: `delete-me.${crypto.randomUUID().slice(0, 8)}`,
    };

    const createResponse = await request.post(`${apiBase}/v1/projects`, {
      data: { project },
    });
    expect(createResponse.ok()).toBeTruthy();

    await openProjects(page);
    await page
      .getByRole("listitem")
      .filter({ hasText: `API · ${project.id}` })
      .getByRole("button", { name: "Delete" })
      .click();
    await page
      .getByRole("dialog", { name: "Delete project" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(
      page.getByRole("link", { name: new RegExp(project.id) }),
    ).toHaveCount(0);
  });
});
