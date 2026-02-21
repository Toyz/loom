import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
    target: "es2022",
  },
  resolve: {
    alias: {
      "@toyz/loom/store": resolve(__dirname, "../src/store/index.ts"),
      "@toyz/loom/decorators": resolve(__dirname, "../src/decorators/index.ts"),
      "@toyz/loom/jsx-runtime": resolve(__dirname, "../src/jsx-runtime.ts"),
      "@toyz/loom/jsx-dev-runtime": resolve(__dirname, "../src/jsx-runtime.ts"),
      "@toyz/loom": resolve(__dirname, "../src/index.ts"),
      "@toyz/loom-flags/testing": resolve(__dirname, "src/testing.ts"),
      "@toyz/loom-flags": resolve(__dirname, "src/index.ts"),
    },
  },
});
