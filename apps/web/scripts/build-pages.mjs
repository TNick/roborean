import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const distDir = path.join(webRoot, "dist");

const clientId = (process.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
if (!clientId) {
  console.error("VITE_GOOGLE_CLIENT_ID is required for the GitHub Pages build");
  process.exit(1);
}

const env = {
  ...process.env,
  VITE_STORAGE_MODE: "google",
  VITE_PAGES_BASE: process.env.VITE_PAGES_BASE || "/roborean/",
  VITE_GOOGLE_CLIENT_ID: clientId,
};

// Clear any API base URL so the static bundle cannot require a backend.
delete env.VITE_API_BASE_URL;

const build = spawnSync("pnpm", ["exec", "vite", "build"], {
  cwd: webRoot,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const indexPath = path.join(distDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("Pages build did not produce apps/web/dist/index.html");
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, "utf8");
if (!indexHtml.includes("/roborean/")) {
  console.error("Pages bundle is missing the /roborean/ asset base path");
  process.exit(1);
}

for (const entry of fs.readdirSync(distDir, { recursive: true })) {
  const full = path.join(distDir, String(entry));
  if (!fs.statSync(full).isFile()) {
    continue;
  }
  if (!/\.(html|js|css)$/.test(full)) {
    continue;
  }
  const text = fs.readFileSync(full, "utf8");
  if (text.includes("localhost:8765")) {
    console.error(
      `Pages bundle unexpectedly references localhost:8765 in ${entry}`,
    );
    process.exit(1);
  }
}

console.log("GitHub Pages bundle ready in apps/web/dist");
