#!/usr/bin/env node

/**
 * Install a sibling package against the core in this checkout.
 *
 * A sibling declares `@toyz/loom: ^0.23.0`, and that version does not exist on
 * the registry until the moment it is published -- which is *after* CI and the
 * release gate need to install. So `npm ci` fails with ETARGET on every commit
 * between bumping the range and publishing, including the release run that is
 * trying to do the publishing. The dependency is real; it just is not
 * downloadable yet.
 *
 * So point it at the checkout for the duration of the install, then put the
 * manifest back. The restore matters: the published package must declare the
 * semver range, not a `file:` path that would be meaningless to anyone else.
 *
 *   node scripts/install-linked.mjs loom-rpc
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, CORE } from "./packages.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("\n  Usage: node scripts/install-linked.mjs <package-dir>\n");
  process.exit(1);
}

const manifestPath = join(ROOT, dir, "package.json");
const original = readFileSync(manifestPath, "utf-8");

try {
  const pkg = JSON.parse(original);
  const declared = pkg.dependencies?.[CORE.name];

  if (declared) {
    // A relative path, so the install works the same on any runner.
    const rel = relative(join(ROOT, dir), ROOT) || ".";
    pkg.dependencies[CORE.name] = `file:${rel}`;
    writeFileSync(manifestPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`  ${dir}: ${CORE.name} ${declared} -> file:${rel} for install`);
  }

  // `install`, not `ci`: the lockfile still records the registry range, and
  // rewriting the manifest is exactly the kind of drift `ci` refuses.
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--no-save"], {
    cwd: join(ROOT, dir),
    stdio: "inherit",
  });
} finally {
  // Always, including on failure: leaving a `file:` dependency behind would
  // publish a package nobody else can install.
  writeFileSync(manifestPath, original);
}

console.log(`  ${dir}: installed against the local core`);
