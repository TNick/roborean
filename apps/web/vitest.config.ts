import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      VITE_STORAGE_MODE: "",
      VITE_GOOGLE_CLIENT_ID: "",
    },
  },
});
