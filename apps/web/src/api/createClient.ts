import { createRoboreanClient } from "@roborean/api-types";
import { API_BASE_URL } from "../config.js";

export function createClient() {
  return createRoboreanClient({ baseUrl: API_BASE_URL });
}
