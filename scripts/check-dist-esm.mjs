#!/usr/bin/env node

/**
 * Every relative import in a built package must carry its file extension.
 *
 * All five packages are `"type": "module"` and shipped 250+ extensionless
 * relative imports. Bundlers resolve those, so the docs site, every browser
 * build and the whole test suite were fine -- and Node was not. `import
 * "@toyz/loom"` from Node, or from Vitest resolving a dependency, died on
 * "Cannot find module .../dist/app". That is why the scaffolder could never
 * ship a working test runner.
 *
 * Nothing in the repo exercised dist under Node, so nothing caught it. This
 * does, and it is cheap enough to run on every build.
 *
 *   node scripts/check-dist-esm.mjs            # all packages that build
 *   node scripts/check-dist-esm.mjs rpc flags  # just these
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readdirSync, statSync } from "node:fs";
import { PACKAGES, ROOT, byId } from "./packages.mjs";

/** `from "..."` and `import("...")`, relative specifiers only. */
const SPEC = /(?:from\s*|import\s*\(\s*)"(\.[^"]*)"/g;

/**
 * Blank out comments and string bodies, keeping offsets so line numbers stay
 * true.
 *
 * tsc copies JSDoc into the emit, and lazy.ts documents `@lazy(() =>
 * import("./pages/settings"))` -- a made-up path in an example, which a plain
 * text scan reports as a broken specifier. Stripping first is the difference
 * between a check that is trusted and one that gets muted.
 */
function stripNonCode(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === "//") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (two === "/*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      // Keep newlines so reported line numbers still line up.
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (src[i] === "`") {
      // Template literals can hold anything, including `${}`; blank the lot.
      let j = i + 1;
      while (j < src.length && !(src[j] === "`" && src[j - 1] !== "\\")) j++;
      out += " ".repeat(Math.min(j + 1, src.length) - i);
      i = j + 1;
    } else if (src[i] === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "\n" && !(src[j] === "'" && src[j - 1] !== "\\")) j++;
      out += " ".repeat(Math.min(j + 1, src.length) - i);
      i = j + 1;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

const ids = process.argv.slice(2);
const targets = (ids.length ? ids.map(byId) : PACKAGES).filter((p) => p.builds);

let bad = 0;
let checked = 0;

for (const pkg of targets) {
  const dist = join(ROOT, pkg.dir, "dist");
  if (!existsSync(dist)) {
    console.error(`  ${pkg.name}: no dist/ -- build it first`);
    bad++;
    continue;
  }

  for (const file of jsFiles(dist)) {
    const text = stripNonCode(readFileSync(file, "utf-8"));
    for (const m of text.matchAll(SPEC)) {
      checked++;
      const spec = m[1];
      if (spec.endsWith(".js") || spec.endsWith(".json") || spec.endsWith(".mjs")) continue;
      bad++;
      console.error(`  ${file.slice(ROOT.length + 1)}: "${spec}" has no extension`);
    }
  }
}

if (bad) {
  console.error(
    `\nFAIL: ${bad} relative import(s) Node cannot resolve.\n` +
    `Write the extension in the source ("./foo.js", "./bar/index.js").\n` +
    `moduleResolution is nodenext, so tsc flags these at the source.\n`,
  );
  process.exit(1);
}

console.log(`dist ESM specifiers OK (${checked} checked across ${targets.length} package(s))`);
