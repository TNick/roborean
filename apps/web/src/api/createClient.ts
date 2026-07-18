import { createRoboreanClient } from "@roborean/api-types";
import { API_BASE_URL, IS_API_AVAILABLE } from "../config.js";

/**
 * Create the FastAPI-backed client used when API storage is available.
 *
 * @returns Roborean HTTP client.
 */
export function createClient() {
  if (!IS_API_AVAILABLE) {
    throw new Error(
      "createClient() is unavailable in Google-only builds; use useWorkspace()",
    );
  }
  return createRoboreanClient({ baseUrl: API_BASE_URL });
}
