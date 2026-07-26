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
    // Aliases are matched in insertion order, so every subpath MUST come before
    // the barrel it prefixes ("element/icon" before "element", and all loom
    // subpaths before bare "@toyz/loom").
    alias: {
      // loom aliases — resolve to src/ so the docs exercise the working tree.
      // Without these, node_modules/@toyz/loom (a symlink to the repo root)
      // resolves through package.json exports to dist/, and the site silently
      // runs against whatever was last built. Mirrors vitest.config.ts.
      "@toyz/loom/jsx-runtime": resolve(root, "src/jsx-runtime.ts"),
      "@toyz/loom/jsx-dev-runtime": resolve(root, "src/jsx-dev-runtime.ts"),
      "@toyz/loom/element/icon": resolve(root, "src/element/icon.ts"),
      "@toyz/loom/element/virtual": resolve(root, "src/element/virtual.ts"),
      "@toyz/loom/element/canvas": resolve(root, "src/element/canvas.ts"),
      "@toyz/loom/element/image": resolve(root, "src/element/image.ts"),
      "@toyz/loom/element": resolve(root, "src/element/index.ts"),
      "@toyz/loom/router": resolve(root, "src/router/index.ts"),
      "@toyz/loom/store": resolve(root, "src/store/index.ts"),
      "@toyz/loom/di": resolve(root, "src/di/index.ts"),
      "@toyz/loom/transform": resolve(root, "src/transform/index.ts"),
      "@toyz/loom/query": resolve(root, "src/query/index.ts"),
      "@toyz/loom/decorators": resolve(root, "src/decorators/index.ts"),
      "@toyz/loom/debug": resolve(root, "src/debug/inspect.ts"),
      "@toyz/loom/testing": resolve(root, "src/testing.ts"),
      "@toyz/loom": resolve(root, "src/index.ts"),
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
