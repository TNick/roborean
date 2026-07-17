import { test, expect } from "@playwright/test";

test("home → example project → dry-run succeeds", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Roborean" })).toBeVisible();
  await page.getByRole("link", { name: "Open projects" }).click();
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await page.getByRole("button", { name: "Open set-and-copy example" }).click();
  await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByTestId("dry-run-status")).toHaveText("success");
});
