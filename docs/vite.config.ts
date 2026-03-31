import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

/** Config dir — stable when Vite bundles this file to a temp path (cwd-independent) */
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
const loomRpcPkg = JSON.parse(readFileSync(resolve(root, "loom-rpc/package.json"), "utf-8"));
const loomAnalyticsPkg = JSON.parse(readFileSync(resolve(root, "loom-analytics/package.json"), "utf-8"));
const loomFlagsPkg = JSON.parse(readFileSync(resolve(root, "loom-flags/package.json"), "utf-8"));
const loomPlaceholderPkg = JSON.parse(readFileSync(resolve(root, "loom-placeholder/package.json"), "utf-8"));

export default defineConfig({
  base: process.env.CI ? "/loom/" : "/",
  server: {
    port: 5173,
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
    __LOOM_PLACEHOLDER_VERSION__: JSON.stringify(loomPlaceholderPkg.version),
    __CREATE_LOOM_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(resolve(root, "create-loom/package.json"), "utf-8")).version,
    ),
  },
  resolve: {
    // Prevent dual module instances — ensures loom-rpc's imports of
    // @toyz/loom resolve to the same copy as the docs site's imports.
    dedupe: ["@toyz/loom"],
    alias: {
      // loom-rpc aliases
      "@toyz/loom-rpc/testing": resolve(root, "loom-rpc/src/testing.ts"),
      "@toyz/loom-rpc": resolve(root, "loom-rpc/src/index.ts"),
      // loom-analytics aliases
      "@toyz/loom-analytics/testing": resolve(root, "loom-analytics/src/testing.ts"),
      "@toyz/loom-analytics": resolve(root, "loom-analytics/src/index.ts"),
      // loom-flags aliases
      "@toyz/loom-flags/testing": resolve(root, "loom-flags/src/testing.ts"),
      "@toyz/loom-flags": resolve(root, "loom-flags/src/index.ts"),
      // loom-placeholder aliases
      "@toyz/loom-placeholder/testing": resolve(root, "loom-placeholder/src/testing.ts"),
      "@toyz/loom-placeholder": resolve(root, "loom-placeholder/src/index.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
    target: "es2022",
    keepNames: true,
  },
});
