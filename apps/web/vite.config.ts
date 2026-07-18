import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");

/**
 * Vite base path for GitHub Pages (`/roborean/`) or local `/`.
 */
const pagesBase = process.env.VITE_PAGES_BASE ?? "/";

export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
  },
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
    ],
    alias: {
      "@roborean/editor": path.resolve(
        __dirname,
        "../../packages/typescript/editor/src/index.ts",
      ),
      "@roborean/ui": path.resolve(
        __dirname,
        "../../packages/typescript/ui/src/index.tsx",
      ),
      "@roborean/google-workspace": path.resolve(
        __dirname,
        "../../packages/typescript/google-workspace/src/index.ts",
      ),
      "@roborean/engine": path.resolve(
        __dirname,
        "../../packages/typescript/engine/src/index.ts",
      ),
      "@roborean/validation": path.resolve(
        __dirname,
        "../../packages/typescript/validation/src/index.ts",
      ),
      "@roborean/documents-base": path.resolve(
        __dirname,
        "../../packages/typescript/documents-base/src/index.ts",
      ),
    },
  },
});
