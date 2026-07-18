import { expect, type Page } from "@playwright/test";

/**
 * Navigate to the home page and wait for the shell heading.
 *
 * @param page - Playwright page handle.
 */
export async function goHome(page: Page): Promise<void> {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Roborean" })).toBeVisible();
}

/**
 * Open the projects list from the home page.
 *
 * @param page - Playwright page handle.
 */
export async function openProjects(page: Page): Promise<void> {
  await goHome(page);
  await page.getByRole("link", { name: "Open projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
}

/**
 * Open the templates library from the home page.
 *
 * @param page - Playwright page handle.
 */
export async function openTemplatesLibrary(page: Page): Promise<void> {
  await goHome(page);
  await page.getByRole("link", { name: "Browse templates library" }).click();
  await expect(page).toHaveURL(/#\/templates$/);
  await expect(
    page.getByRole("heading", { name: "Templates library" }),
  ).toBeVisible();
}

/**
 * Focus a templates library catalog section.
 *
 * Uses tabs on narrow layouts; on wide card layouts the section is already
 * visible and this only asserts the section heading.
 *
 * @param page - Playwright page handle.
 * @param tabName - Visible tab or card heading label.
 */
export async function selectTemplatesTab(
  page: Page,
  tabName: "Document templates" | "Project starters" | "Recipes",
): Promise<void> {
  const tab = page.getByRole("tab", { name: tabName });

  if (await tab.isVisible()) {
    await tab.click();
    return;
  }

  await expect(page.getByRole("heading", { name: tabName })).toBeVisible();
}

/**
 * Assert the three catalog sections are present (tabs or card headings).
 *
 * @param page - Playwright page handle.
 */
export async function expectTemplatesCatalogSections(
  page: Page,
): Promise<void> {
  for (const name of [
    "Document templates",
    "Project starters",
    "Recipes",
  ] as const) {
    const tab = page.getByRole("tab", { name });
    const heading = page.getByRole("heading", { name });
    await expect(tab.or(heading)).toBeVisible();
  }
}

/**
 * Create a project from a starter entry on the Project starters tab.
 *
 * @param page - Playwright page handle.
 * @param starterId - Starter catalog entry id.
 */
export async function useProjectStarter(
  page: Page,
  starterId: string,
): Promise<void> {
  await selectTemplatesTab(page, "Project starters");
  const templateLoaded = page.waitForResponse(
    (response) =>
      response.url().includes("/templates/") &&
      response.url().includes("/content") &&
      response.ok(),
  );
  await page.getByTestId(`use-starter-${starterId}`).click();
  await expect(page).toHaveURL(/#\/projects\/api\/.+/);
  await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
  await templateLoaded;
}

/**
 * Run a local dry-run and wait for success.
 *
 * @param page - Playwright page handle.
 */
export async function runDryRun(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByTestId("dry-run-status")).toHaveText("success");
}

/**
 * Assert the preview panel shows expected rendered body text.
 *
 * @param page - Playwright page handle.
 * @param expected - Substring or pattern expected in preview body.
 */
export async function expectPreviewBody(
  page: Page,
  expected: string | RegExp,
): Promise<void> {
  await expect(page.getByTestId("preview-panel")).toBeVisible();
  await expect(page.getByTestId("preview-body")).toContainText(expected);
}

/**
 * Open a project from the list using its stored id.
 *
 * @param page - Playwright page handle.
 * @param projectId - Stored project id shown in list secondary text.
 */
export async function openProjectFromList(
  page: Page,
  projectId: string,
): Promise<void> {
  await page.getByRole("link", { name: new RegExp(projectId) }).click();
  await expect(page).toHaveURL(
    new RegExp(`#/projects/api/${projectId.replace(/\./g, "\\.")}$`),
  );
}

/**
 * Select a document in the editor documents list.
 *
 * @param page - Playwright page handle.
 * @param documentTitle - Document display title.
 */
export async function selectDocument(
  page: Page,
  documentTitle: string,
): Promise<void> {
  await page
    .getByRole("button", { name: new RegExp(`^${documentTitle} text ·`) })
    .click();
}
