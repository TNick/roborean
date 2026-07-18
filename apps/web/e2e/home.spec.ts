import { test, expect } from "@playwright/test";

import { goHome, openProjects, openTemplatesLibrary } from "./helpers/ui.js";

test.describe("Home page", () => {
  test("shows entry points for API mode", async ({ page }) => {
    await goHome(page);
    await expect(
      page.getByRole("link", { name: "Open projects" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse templates library" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect Google Drive" }),
    ).toHaveCount(0);
  });

  test("does not block the shell with a Drive folder gate in API mode", async ({
    page,
  }) => {
    await goHome(page);
    await expect(page.getByText("Select a Google Drive folder")).toHaveCount(0);
  });

  test("navigates to projects and templates", async ({ page }) => {
    await openProjects(page);
    await expect(page).toHaveURL(/#\/projects$/);

    await goHome(page);
    await openTemplatesLibrary(page);
    await expect(page).toHaveURL(/#\/templates$/);
  });
});
