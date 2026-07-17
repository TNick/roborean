import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const openapiPath = path.join(root, "..", "openapi", "openapi.json");
if (!fs.existsSync(openapiPath)) {
  console.warn("Run make openapi to create openapi/openapi.json");
  process.exit(0);
}
console.log("OpenAPI present at", openapiPath);
