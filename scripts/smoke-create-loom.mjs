#!/usr/bin/env node

/**
 * Scaffold a project the way a user would, then install, test and build it.
 *
 * create-loom shipped with no gate at all -- its workflow was `npm publish`
 * and nothing else -- so a broken template could only be found by someone
 * running `npm create` and hitting it. That is how it ended up promising a
 * test runner it did not ship, and how the template could have referenced a
 * `.gitignore` npm strips out of the tarball.
 *
 * This packs both packages first, so what gets scaffolded is the tarball as
 * published, not the checkout: `files`, the `_gitignore` rename and the
 * template's own dependency pin are all part of what is under test.
 *
 *   node scripts/smoke-create-loom.mjs
 */

import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { ROOT, CORE, byId, readManifest } from "./packages.mjs";

const work = mkdtempSync(join(tmpdir(), "loom-smoke-"));
let failed = false;

/** Drop SGR escape sequences so the output can be matched on. */
const stripAnsi = (text) => text.replace(/\u001B\[[0-9;]*m/g, "");

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: "pipe", encoding: "utf-8" });

function step(label, fn) {
  process.stdout.write(`  ${label} ... `);
  try {
    const detail = fn();
    console.log(detail ? `ok (${detail})` : "ok");
  } catch (e) {
    failed = true;
    console.log("FAIL");
    console.error(`\n${e.stdout || ""}${e.stderr || ""}${e.message}\n`);
    throw e;
  }
}

try {
  const scaffolder = byId("create-loom");

  step("pack @toyz/loom", () => {
    run("npm", ["pack", "--pack-destination", work], join(ROOT, CORE.dir));
    return `${readManifest(CORE).version}`;
  });

  step("pack @toyz/create-loom", () => {
    run("npm", ["pack", "--pack-destination", work], join(ROOT, scaffolder.dir));
    return `${readManifest(scaffolder).version}`;
  });

  const coreTgz = join(work, `toyz-loom-${readManifest(CORE).version}.tgz`);
  const cliTgz = join(work, `toyz-create-loom-${readManifest(scaffolder).version}.tgz`);

  step("extract the scaffolder tarball", () => {
    run("tar", ["xzf", cliTgz], work);
  });

  const app = join(work, "smoke-app");

  step("scaffold a project", () => {
    run("node", [join(work, "package", "bin", "create-loom.js"), "smoke-app"], work);
    if (!existsSync(app)) throw new Error("scaffold produced no directory");
  });

  step(".gitignore survives packing", () => {
    // npm strips a literal .gitignore from the tarball, so the template ships
    // it as _gitignore and the CLI renames it. If that ever regresses, every
    // generated project starts committing node_modules.
    if (!existsSync(join(app, ".gitignore"))) {
      throw new Error("no .gitignore in the scaffolded project");
    }
    if (existsSync(join(app, "_gitignore"))) {
      throw new Error("_gitignore was copied but never renamed");
    }
  });

  step("package name is npm-legal", () => {
    const name = JSON.parse(readFileSync(join(app, "package.json"), "utf-8")).name;
    if (!/^[a-z0-9][a-z0-9._~-]*$/.test(name)) {
      throw new Error(`"${name}" is not a valid npm package name`);
    }
    return name;
  });

  step("install (against the packed core)", () => {
    // Point the scaffolded project at this tree's tarball rather than the
    // registry. The gate has to cover the code about to be released, and on a
    // release run the version it pins does not exist on npm yet -- that is the
    // whole reason we are running. Whether the pin itself is sane is a
    // separate question, answered by scripts/check-versions.mjs.
    const manifest = join(app, "package.json");
    const json = JSON.parse(readFileSync(manifest, "utf-8"));
    json.dependencies[CORE.name] = `file:${coreTgz}`;
    writeFileSync(manifest, JSON.stringify(json, null, 2) + "\n");

    run("npm", ["install", "--no-audit", "--no-fund"], app);
    const installed = join(app, "node_modules", "@toyz", "loom", "package.json");
    return `loom ${JSON.parse(readFileSync(installed, "utf-8")).version}`;
  });

  step("npm run typecheck", () => run("npm", ["run", "typecheck"], app));
  step("npm test", () => {
    // Vitest colours its summary when it believes it is on a terminal, which
    // it does on a CI runner. The escape codes land between "Tests" and the
    // count, so a plain whitespace match succeeds locally and fails on CI --
    // the scaffold's tests pass either way, only the assertion about them
    // breaks, which is the worst kind of false alarm.
    const out = stripAnsi(run("npm", ["test"], app));
    const m = /Tests\s+(\d+)\s+passed/.exec(out);
    if (!m) throw new Error(`no passing tests reported:\n${out}`);
    return `${m[1]} passing`;
  });
  step("npm run build", () => {
    run("npm", ["run", "build"], app);
    if (!existsSync(join(app, "dist", "index.html"))) {
      throw new Error("build produced no dist/index.html");
    }
  });
} catch {
  failed = true;
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failed) {
  console.error("\ncreate-loom smoke test FAILED\n");
  process.exit(1);
}
console.log("\ncreate-loom smoke test passed\n");
