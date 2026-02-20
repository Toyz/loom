import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { resolve } from "path";

const pkg = JSON.parse(readFileSync("../package.json", "utf-8"));
const loomRpcPkg = JSON.parse(readFileSync("../loom-rpc/package.json", "utf-8"));

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
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
    target: "es2022",
    keepNames: true,
  },
});

