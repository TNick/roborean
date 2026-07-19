import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

// Resolve the web package directory for Vite and .env.local loading.
const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");

// Load local public configuration before applying Google-only overrides.
const loadedEnv = loadEnv("development", webRoot, "");
const clientId = (
  process.env.VITE_GOOGLE_CLIENT_ID ??
  loadedEnv.VITE_GOOGLE_CLIENT_ID ??
  ""
).trim();

// Refuse to start an unusable Drive-only app without an OAuth client id.
if (!clientId) {
  console.error(
    "VITE_GOOGLE_CLIENT_ID is required; set it in apps/web/.env.local",
  );
  process.exit(1);
}

// Match the Pages storage contract while retaining a local root asset base.
const env = {
  ...loadedEnv,
  ...process.env,
  VITE_STORAGE_MODE: "google",
  VITE_PAGES_BASE: process.env.VITE_PAGES_BASE ?? "/",
  VITE_GOOGLE_CLIENT_ID: clientId,
};
delete env.VITE_API_BASE_URL;

// Run Vite as the foreground development server so Make can be interrupted.
const vite = spawn("pnpm", ["exec", "vite"], {
  cwd: webRoot,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

// Preserve Vite's result code for shells and automation.
vite.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
