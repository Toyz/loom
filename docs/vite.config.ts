import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { resolve } from "path";

const pkg = JSON.parse(readFileSync("../package.json", "utf-8"));
const loomRpcPkg = JSON.parse(readFileSync("../loom-rpc/package.json", "utf-8"));
const loomAnalyticsPkg = JSON.parse(readFileSync("../loom-analytics/package.json", "utf-8"));
const loomFlagsPkg = JSON.parse(readFileSync("../loom-flags/package.json", "utf-8"));

export default defineConfig({
  base: process.env.CI ? "/loom/" : "/",
  server: {
    port: 4200,
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
  },
  define: {
    __LOOM_VERSION__: JSON.stringify(pkg.version),
    __LOOM_RPC_VERSION__: JSON.stringify(loomRpcPkg.version),
    __LOOM_ANALYTICS_VERSION__: JSON.stringify(loomAnalyticsPkg.version),
    __LOOM_FLAGS_VERSION__: JSON.stringify(loomFlagsPkg.version),
    __CREATE_LOOM_VERSION__: JSON.stringify(
      JSON.parse(readFileSync("../create-loom/package.json", "utf-8")).version,
    ),
  },
  resolve: {
    // Prevent dual module instances — ensures loom-rpc's imports of
    // @toyz/loom resolve to the same copy as the docs site's imports.
    dedupe: ["@toyz/loom"],
    alias: {
      // loom-rpc aliases
      "@toyz/loom-rpc/testing": resolve(__dirname, "../loom-rpc/src/testing.ts"),
      "@toyz/loom-rpc": resolve(__dirname, "../loom-rpc/src/index.ts"),
      // loom-analytics aliases
      "@toyz/loom-analytics/testing": resolve(__dirname, "../loom-analytics/src/testing.ts"),
      "@toyz/loom-analytics": resolve(__dirname, "../loom-analytics/src/index.ts"),
      // loom-flags aliases
      "@toyz/loom-flags/testing": resolve(__dirname, "../loom-flags/src/testing.ts"),
      "@toyz/loom-flags": resolve(__dirname, "../loom-flags/src/index.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
    target: "es2022",
    keepNames: true,
  },
});

