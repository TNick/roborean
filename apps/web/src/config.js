/**
 * Public Google OAuth client id for browser Google Workspace mode.
 */
export const GOOGLE_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
).trim();
/**
 * Resolve the active storage mode for this build.
 *
 * @returns `google` for browser Workspace mode, otherwise `api`.
 */
export function resolveStorageMode() {
  // Prefer an explicit build-time mode so Vite can tree-shake branches.
  const configuredMode = String(import.meta.env.VITE_STORAGE_MODE ?? "").trim();
  if (configuredMode === "google" || configuredMode === "api") {
    return configuredMode;
  }
  if (GOOGLE_CLIENT_ID) {
    return "google";
  }
  return "api";
}
/**
 * Active storage mode for the running app.
 */
export const STORAGE_MODE =
  import.meta.env.VITE_STORAGE_MODE === "google"
    ? "google"
    : import.meta.env.VITE_STORAGE_MODE === "api"
      ? "api"
      : resolveStorageMode();
/**
 * True when the app must use Google Drive/Sheets storage.
 */
export const IS_GOOGLE_MODE = STORAGE_MODE === "google";
/**
 * Optional FastAPI base URL for API storage mode.
 *
 * Google Workspace / Pages builds set `VITE_STORAGE_MODE=google` so Vite
 * eliminates the localhost default from the static bundle.
 */
export const API_BASE_URL =
  import.meta.env.VITE_STORAGE_MODE === "google"
    ? ""
    : String(import.meta.env.VITE_API_BASE_URL ?? "").trim() ||
      "http://localhost:8765";
