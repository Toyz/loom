import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "fs";
import { gzipSync } from "zlib";
import { buildSync } from "esbuild";
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

/**
 * Count declared tests, for the spec card in the docs shell.
 *
 * Counted statically rather than by running the suite: a docs build should
 * not depend on a test run, and the number has to exist even when the tests
 * are failing. The suite declares no `.each` blocks, so one declaration is
 * one case and this matches what vitest reports exactly -- 1442 at the time
 * of writing, being 1441 passing plus 1 skipped. If `.each` is ever
 * introduced this undercounts, and the honest fix then is to read a JSON
 * reporter instead of loosening the claim.
 */
function countTests(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      total += countTests(full);
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      const src = readFileSync(full, "utf-8");
      total += (src.match(/^\s*(?:it|test)(?:\.\w+)*\s*\(/gm) ?? []).length;
    }
  }
  return total;
}

const testCount = countTests(resolve(root, "tests"));

/**
 * Core bundle size: minified, tree-shaken, gzipped.
 *
 * Measured rather than asserted, and measured the way a consumer would get it
 * — bundling the public entry, not summing the files in dist/. Returns 0 if
 * dist/ has not been built, and the page omits the figure rather than
 * printing a zero.
 */
function coreGzipBytes(): number {
  try {
    const out = buildSync({
      entryPoints: [resolve(root, "dist/index.js")],
      bundle: true,
      minify: true,
      format: "esm",
      write: false,
      logLevel: "silent",
    });
    const js = out.outputFiles?.[0]?.contents;
    return js ? gzipSync(Buffer.from(js), { level: 9 }).length : 0;
  } catch {
    return 0;
  }
}

const coreBytes = coreGzipBytes();

/**
 * Keep the decorator registry honest.
 *
 * Three hand-maintained things have to agree: the list that drives the home
 * page count and the reference page, the doc-tip popover summaries, and what
 * loom actually exports. They had drifted badly -- the home page claimed 41
 * decorators when there were 56, because @api, @intercept, @attribute,
 * @store, @signal and nine others had been documented without ever being
 * added to the list.
 *
 * Checked at build time rather than trusted, since the failure is silent:
 * a wrong count looks exactly like a right one.
 */
function checkDecoratorRegistry(): void {
  const collect = (dir: string, out: Set<string>) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) { collect(full, out); continue; }
      if (!/\.ts$/.test(entry.name)) continue;
      const src = readFileSync(full, "utf-8");
      for (const m of src.matchAll(/export (?:const|function|class|abstract class) (\w+)/g)) {
        out.add(m[1]!);
      }
      for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
        for (const part of m[1]!.split(",")) {
          const name = part.trim().split(" as ").pop()!.trim();
          if (name && !name.startsWith("type ")) out.add(name);
        }
      }
    }
  };
  const exported = new Set<string>();
  collect(resolve(root, "src"), exported);

  const listSrc = readFileSync(resolve(__dirname, "src/data/decorators.ts"), "utf-8");
  const helpSrc = readFileSync(resolve(__dirname, "src/data/decorator-help.ts"), "utf-8");

  const listed = [...listSrc.matchAll(/\{ name: "([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((n) => n.startsWith("@"))
    .map((n) => n.slice(1));
  const helped = new Set(
    [...helpSrc.matchAll(/^\s{2}(\w+):\s*\{ summary:/gm)].map((m) => m[1]!),
  );

  const problems: string[] = [];
  for (const d of listed) {
    if (!exported.has(d)) problems.push(`@${d} is listed but loom does not export it`);
    if (!helped.has(d)) problems.push(`@${d} is listed but has no doc-tip summary`);
  }
  for (const h of helped) {
    if (!listed.includes(h)) problems.push(`@${h} has a doc-tip summary but is missing from the list`);
  }
  if (problems.length) {
    throw new Error("[docs] decorator registry is out of sync:\n  " + problems.join("\n  "));
  }
}

checkDecoratorRegistry();

// Fail the build rather than ship a spec card confidently printing "0 TESTS".
// A zero here means the directory moved, not that the suite is empty.
if (testCount === 0) {
  throw new Error("[docs] counted 0 tests in tests/ — has the directory moved?");
}

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
    __LOOM_TESTS__: JSON.stringify(testCount),
    __LOOM_GZIP_BYTES__: JSON.stringify(coreBytes),
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
