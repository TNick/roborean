import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";
import type { Project } from "@roborean/spec";

import {
  expectTemplatesCatalogSections,
  goHome,
  openProjects,
  openProjectFromList,
  runDryRun,
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

test("smoke: home → templates library shows three sections", async ({
  page,
}) => {
  await goHome(page);
  await page.getByRole("link", { name: "Browse templates library" }).click();
  await expect(page).toHaveURL(/#\/templates$/);
  await expectTemplatesCatalogSections(page);
});

test("smoke: home → seeded project → dry-run succeeds", async ({
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
