import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: true,
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
  },
  resolve: {
    alias: {
      "@toyz/loom/jsx-runtime": resolve(__dirname, "src/jsx-runtime.ts"),
      "@toyz/loom/jsx-dev-runtime": resolve(__dirname, "src/jsx-dev-runtime.ts"),
      "@toyz/loom": resolve(__dirname, "src/index.ts"),
    },
  },
});
