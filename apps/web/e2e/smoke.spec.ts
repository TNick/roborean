import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";
import type { Project } from "@roborean/spec";

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

test("home → templates library shows three tabs", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Roborean" })).toBeVisible();
  await page.getByRole("link", { name: "Browse templates library" }).click();
  await expect(page).toHaveURL(/#\/templates$/);
  await expect(
    page.getByRole("tab", { name: "Document templates" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Project starters" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Recipes" })).toBeVisible();
});

test("home → project → dry-run succeeds", async ({ page, request }) => {
  const project = loadJson(
    "conformance/projects/02_set_and_copy.json",
  ) as Project;

  const createResponse = await request.post(`${apiBase}/v1/projects`, {
    data: { project },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();
  const projectId = (created.project as { id: string }).id;

  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Roborean" })).toBeVisible();
  await page.getByRole("link", { name: "Open projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.getByRole("link", { name: "Set and copy" }).click();
  await expect(page).toHaveURL(new RegExp(`#/projects/${projectId}$`));
  await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByTestId("dry-run-status")).toHaveText("success");
});
