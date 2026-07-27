import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Components are real custom elements, so tests need a DOM that has a
    // custom element registry and a shadow DOM.
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
    target: "es2022",
    keepNames: true,
  },
});
