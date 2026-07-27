#!/usr/bin/env node

/**
 * Run the release gate for one package: install, typecheck, test, build, and
 * check the output is resolvable by Node.
 *
 * Exists so the release workflow can loop over several packages without the
 * steps being written out per package in YAML -- which is how six publish
 * workflows drifted apart, three of them losing their test step along the way.
 *
 *   node scripts/gate.mjs rpc
 *   node scripts/gate.mjs loom --skip-install
 */

import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, byId, CORE } from "./packages.mjs";

const [id, ...flags] = process.argv.slice(2);
const skipInstall = flags.includes("--skip-install");

if (!id) {
  console.error("\n  Usage: node scripts/gate.mjs <package> [--skip-install]\n");
  process.exit(1);
}

let pkg;
try {
  pkg = byId(id);
} catch (e) {
  console.error(`\n  ${e.message}\n`);
  process.exit(1);
}

const dir = join(ROOT, pkg.dir);

function run(label, cmd, args, cwd = dir) {
  console.log(`\n  [${pkg.id}] ${label}`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

// create-loom has no source to typecheck and no build; its gate is a real
// scaffold, which the caller runs separately because it also covers core.
if (!pkg.builds) {
  console.log(`  [${pkg.id}] no build -- gated by scripts/smoke-create-loom.mjs`);
  process.exit(0);
}

if (!skipInstall && !pkg.core) {
  // Not `npm ci`: the core version this release is about to publish does not
  // exist on the registry yet, so resolving the declared range fails until
  // after the thing that needs it has already run.
  run("install against the local core", "node",
      [join(ROOT, "scripts", "install-linked.mjs"), pkg.dir], ROOT);
  run(`npm link ${CORE.name}`, "npm", ["link", CORE.name]);
}

run("typecheck", "npx", ["tsc", "--noEmit"]);
run("test", "npm", ["test"]);
run("build", "npm", ["run", "build"]);
run("dist is resolvable by Node", "node", ["scripts/check-dist-esm.mjs", pkg.id], ROOT);

console.log(`\n  [${pkg.id}] gate passed\n`);
