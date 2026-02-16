import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.CI ? "/loom/" : "/",
  server: {
    port: 4200,
  },
  build: {
    outDir: "dist",
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
  },
});
