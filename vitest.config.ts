import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "./src",
  },
});
