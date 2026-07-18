import { test, expect } from "@playwright/test";

import {
  expectPreviewBody,
  expectTemplatesCatalogSections,
  openTemplatesLibrary,
  runDryRun,
  selectDocument,
  selectTemplatesTab,
  useProjectStarter,
} from "./helpers/ui.js";

test.describe("Templates library", () => {
  test.beforeEach(async ({ page }) => {
    await openTemplatesLibrary(page);
  });

  test("shows document, starter, and recipe sections", async ({ page }) => {
    await expectTemplatesCatalogSections(page);
  });

  test("lists document templates on the documents tab", async ({ page }) => {
    await expect(page.getByText("Hello text")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import into project" }).first(),
    ).toBeVisible();
  });

  test("lists starters including Set and copy with preview metadata", async ({
    page,
  }) => {
    await selectTemplatesTab(page, "Project starters");
    await expect(page.getByText("Set and copy")).toBeVisible();
    await expect(
      page.getByText("fills preview documents from workspace"),
    ).toBeVisible();
    await expect(page.getByText("11 bits", { exact: false })).toBeVisible();
    await expect(page.getByText("6 variables", { exact: false })).toBeVisible();
  });

  test("lists recipes on the recipes tab", async ({ page }) => {
    await selectTemplatesTab(page, "Recipes");
    await expect(page.getByText("Set and copy title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import into project" }).first(),
    ).toBeVisible();
  });

  test("Set and copy starter dry-run renders preview from title variable", async ({
    page,
  }) => {
    await useProjectStarter(page, "set-and-copy");
    await runDryRun(page);
    await expectPreviewBody(page, "Title: World");
  });

  test("Set and copy starter preview documents use workspace variables", async ({
    page,
  }) => {
    await useProjectStarter(page, "set-and-copy");
    await runDryRun(page);
    await selectDocument(page, "Copy");
    await expectPreviewBody(page, "Copied title: World");
    await selectDocument(page, "Workspace summary");
    await expectPreviewBody(page, "Title: World");
    await expectPreviewBody(page, "Priority: medium");
  });

  test("Text hello starter dry-run renders greeting preview", async ({
    page,
  }) => {
    await useProjectStarter(page, "text-hello");
    await runDryRun(page);
    await expectPreviewBody(page, "Hello, Ada!");
  });
});
