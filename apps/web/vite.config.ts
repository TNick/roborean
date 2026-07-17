import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
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
