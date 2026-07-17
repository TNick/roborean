import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
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
    },
  },
});
