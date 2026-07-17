# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> home → example project → dry-run succeeds
- Location: e2e\smoke.spec.ts:3:1

# Error details

```
Error: page.goto: net::ERR_NETWORK_ACCESS_DENIED at http://127.0.0.1:15173/
Call log:
  - navigating to "http://127.0.0.1:15173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("home → example project → dry-run succeeds", async ({ page }) => {
> 4  |   await page.goto("/");
     |              ^ Error: page.goto: net::ERR_NETWORK_ACCESS_DENIED at http://127.0.0.1:15173/
  5  |   await expect(page.getByRole("heading", { name: "Roborean" })).toBeVisible();
  6  |   await page.getByRole("link", { name: "Open projects" }).click();
  7  |   await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  8  |   await page.getByRole("button", { name: "Open set-and-copy example" }).click();
  9  |   await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
  10 |   await page.getByRole("button", { name: "Dry-run" }).click();
  11 |   await expect(page.getByTestId("dry-run-status")).toHaveText("success");
  12 | });
  13 | 
```