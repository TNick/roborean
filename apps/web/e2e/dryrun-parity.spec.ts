import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test, expect } from "@playwright/test";
import type { Project } from "@roborean/spec";
import { localDryRun } from "@roborean/validation";

import {
  assertNoBackendOnlySecrets,
  normalizeRun,
  workspacePatchesFromRun,
} from "./helpers/parity.js";

const apiBase = process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:18080";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function loadJson(relativePath: string): unknown {
  const full = path.join(repoRoot, relativePath);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

test("local dry-run patches match server run for set-and-copy", async ({
  request,
}) => {
  const project = loadJson(
    "conformance/projects/02_set_and_copy.json",
  ) as Project;
  const createResponse = await request.post(`${apiBase}/v1/projects`, {
    data: { project },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();
  const projectId = (created.project as { id: string }).id;

  const runResponse = await request.post(
    `${apiBase}/v1/projects/${projectId}/runs`,
    {
      data: {},
      headers: { "Idempotency-Key": crypto.randomUUID() },
    },
  );
  expect(runResponse.ok()).toBeTruthy();
  const serverRun = (await runResponse.json()) as {
    results?: Record<string, unknown>;
  };
  expect(serverRun.results).toBeTruthy();
  assertNoBackendOnlySecrets(JSON.stringify(serverRun));

  const local = localDryRun(project);
  expect(local.results?.status).toBe("success");
  expect(normalizeRun(workspacePatchesFromRun(local.results!))).toEqual(
    normalizeRun(workspacePatchesFromRun(serverRun.results!)),
  );
});

test("API project responses redact backend-only secrets", async ({
  request,
}) => {
  const project = loadJson(
    "conformance/projects/04_secret_ref.json",
  ) as Project;
  const createResponse = await request.post(`${apiBase}/v1/projects`, {
    data: { project },
  });
  expect(createResponse.ok()).toBeTruthy();
  const body = await createResponse.text();
  assertNoBackendOnlySecrets(body);
});
