import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(webRoot, "../..");
const storePath = path.join(repoRoot, "playground/e2e-store");
const artifactRoot = path.join(repoRoot, "playground/e2e-artifacts");

const apiPort = process.env.ROBOREAN_E2E_API_PORT ?? "18080";
const webPort = process.env.ROBOREAN_E2E_WEB_PORT ?? "15173";
const apiBase = `http://127.0.0.1:${apiPort}`;
const webBase = `http://127.0.0.1:${webPort}`;

const isWin = process.platform === "win32";
const python =
  process.env.ROBOREAN_E2E_PYTHON ??
  path.join(
    repoRoot,
    isWin ? "venv/Scripts/python.exe" : "venv/bin/python",
  );

function rmDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve(undefined);
          return;
        }
        retry();
      });
      req.on("error", () => retry());
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

function spawnLogged(label, command, args, options) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: isWin,
    ...options,
  });
}

function watchExit(child, label) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error("%s exited with code %s", label, code);
      process.exit(code ?? 1);
    }
  });
}

rmDir(storePath);
rmDir(artifactRoot);
fs.mkdirSync(storePath, { recursive: true });
fs.mkdirSync(artifactRoot, { recursive: true });

const apiEnv = {
  ...process.env,
  ROBOREAN_STORE_PATH: storePath,
  ROBOREAN_ARTIFACT_ROOT: artifactRoot,
  ROBOREAN_CORS_ORIGINS:
    '["http://127.0.0.1:15173","http://localhost:5173","http://127.0.0.1:5173"]',
};

const api = spawnLogged(
  "api",
  python,
  [
    "-m",
    "uvicorn",
    "roborean_api_app.main:build",
    "--factory",
    "--host",
    "127.0.0.1",
    "--port",
    apiPort,
  ],
  { cwd: repoRoot, env: apiEnv },
);

watchExit(api, "api");

await sleep(1500);

try {
  await waitForUrl(`${apiBase}/health`, 60_000);
} catch (error) {
  console.error("API failed to become ready on %s: %s", apiBase, error);
  process.exit(1);
}

const viteEnv = {
  ...process.env,
  VITE_API_BASE_URL: apiBase,
};

const web = spawnLogged(
  "web",
  isWin ? "pnpm.cmd" : "pnpm",
  [
    "exec",
    "vite",
    "--host",
    "127.0.0.1",
    "--port",
    webPort,
    "--strictPort",
  ],
  { cwd: webRoot, env: viteEnv },
);

watchExit(web, "web");

await sleep(1500);

try {
  await waitForUrl(`${webBase}/`, 60_000);
} catch (error) {
  console.error("Web failed to become ready on %s: %s", webBase, error);
  process.exit(1);
}

console.log("E2E platform ready: web=%s api=%s", webBase, apiBase);

setInterval(() => {}, 60_000);
