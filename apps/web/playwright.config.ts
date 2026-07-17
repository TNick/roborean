import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:15173";

const apiBase = process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:18080";

const jsonOutput = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: jsonOutput
    ? [["list"], ["json", { outputFile: jsonOutput }]]
    : [["list"]],
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    launchOptions: {
      args: [
        "--allow-insecure-localhost",
        "--disable-features=BlockInsecurePrivateNetworkRequests",
      ],
    },
  },
  webServer: {
    command: "node ./e2e/scripts/start-platform.mjs",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ROBOREAN_E2E_API_PORT: process.env.ROBOREAN_E2E_API_PORT ?? "18080",
      ROBOREAN_E2E_WEB_PORT: process.env.ROBOREAN_E2E_WEB_PORT ?? "15173",
      PLAYWRIGHT_API_BASE: apiBase,
      PLAYWRIGHT_BASE_URL: baseURL,
    },
  },
});
