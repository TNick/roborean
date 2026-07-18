/**
 * Storage backend selected for this web build.
 *
 * - `api` — FastAPI is available (default locally). Google Drive is optional
 *   when `VITE_GOOGLE_CLIENT_ID` is set.
 * - `google` — Google-only (GitHub Pages / static). No API URL is bundled.
 */
export type StorageMode = "api" | "google";

/**
 * Which backend owns a project or run in dual-storage builds.
 */
export type StorageSource = "api" | "google";

/**
 * Public Google OAuth client id for browser Google Workspace mode.
 */
export const GOOGLE_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
).trim();

/**
 * Resolve the active storage mode for this build.
 *
 * Unset mode defaults to `api` so a local Google client id does not force
 * Drive-only. Pages builds set `VITE_STORAGE_MODE=google` explicitly.
 *
 * @returns `google` for static Workspace-only builds, otherwise `api`.
 */
export function resolveStorageMode(): StorageMode {
  // Prefer an explicit build-time mode so Vite can tree-shake branches.
  const configuredMode = String(import.meta.env.VITE_STORAGE_MODE ?? "").trim();
  if (configuredMode === "google" || configuredMode === "api") {
    return configuredMode;
  }
  return "api";
}

/**
 * Active storage mode for the running app.
 */
export const STORAGE_MODE: StorageMode =
  import.meta.env.VITE_STORAGE_MODE === "google"
    ? "google"
    : import.meta.env.VITE_STORAGE_MODE === "api"
      ? "api"
      : resolveStorageMode();

/**
 * True when the build is Google-only (no FastAPI backend).
 */
export const IS_GOOGLE_ONLY = STORAGE_MODE === "google";

/**
 * True when the app must use Google Drive/Sheets storage exclusively.
 *
 * Alias of `IS_GOOGLE_ONLY` for existing call sites.
 */
export const IS_GOOGLE_MODE = IS_GOOGLE_ONLY;

/**
 * True when FastAPI storage is configured for this build.
 */
export const IS_API_AVAILABLE = !IS_GOOGLE_ONLY;

/**
 * True when a Google OAuth client id is present (Drive can be connected).
 */
export const IS_GOOGLE_AVAILABLE = Boolean(GOOGLE_CLIENT_ID);

/**
 * Optional FastAPI base URL when API storage is enabled.
 *
 * Google Workspace / Pages builds set `VITE_STORAGE_MODE=google` so Vite
 * eliminates the localhost default from the static bundle.
 */
export const API_BASE_URL = IS_GOOGLE_ONLY
  ? ""
  : String(import.meta.env.VITE_API_BASE_URL ?? "").trim() ||
    "http://localhost:8765";

/**
 * Whether a string is a known storage source.
 *
 * @param value - Candidate path segment.
 * @returns True when value is `api` or `google`.
 */
export function isStorageSource(value: string): value is StorageSource {
  return value === "api" || value === "google";
}

/**
 * Build the project editor path for a storage source.
 *
 * @param source - Backend that owns the project.
 * @param projectId - Stable project id.
 * @returns Hash-router path under `/projects`.
 */
export function projectPath(source: StorageSource, projectId: string): string {
  return `/projects/${source}/${encodeURIComponent(projectId)}`;
}

/**
 * Build the run detail path for a storage source.
 *
 * @param source - Backend that owns the run.
 * @param runId - Stable run id.
 * @returns Hash-router path under `/runs`.
 */
export function runPath(source: StorageSource, runId: string): string {
  return `/runs/${source}/${encodeURIComponent(runId)}`;
}
