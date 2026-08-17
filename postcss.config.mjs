import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  css: {
    postcss: {},
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});