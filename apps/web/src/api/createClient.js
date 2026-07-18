import { createRoboreanClient } from "@roborean/api-types";
import { API_BASE_URL, IS_GOOGLE_MODE } from "../config.js";
/**
 * Create the FastAPI-backed client used in API storage mode.
 *
 * @returns Roborean HTTP client.
 */
export function createClient() {
  if (IS_GOOGLE_MODE) {
    throw new Error(
      "createClient() is unavailable in Google Workspace mode; use useWorkspace()",
    );
  }
  return createRoboreanClient({ baseUrl: API_BASE_URL });
}
