import { defineConfig } from "vite";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("../package.json", "utf-8"));

export default defineConfig({
  base: process.env.CI ? "/loom/" : "/",
  server: {
    port: 4200,
  },
  build: {
    outDir: "dist",
  },
  define: {
    __LOOM_VERSION__: JSON.stringify(pkg.version),
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
  },
});
