#!/usr/bin/env node

/**
 * Every declared dependency on @toyz/loom must admit the core version in this
 * tree, and the scaffolder's template must pin it too.
 *
 * Three siblings sat at `^0.12.8` while core was at 0.22.0 -- they had drifted
 * ten minor versions and nothing said so, because each package builds against
 * a linked local checkout in CI and never resolves its own declared range. A
 * user installing @toyz/loom-flags got a decade-old core alongside it.
 *
 *   node scripts/check-versions.mjs        # report and fail
 *   node scripts/check-versions.mjs --fix  # rewrite the ranges to match
 */

import { CORE, readManifest, writeManifest, dependentsOfCore, readTemplateManifest, writeTemplateManifest } from "./packages.mjs";

const fix = process.argv.includes("--fix");
const coreVersion = readManifest(CORE).version;
const wanted = `^${coreVersion}`;

/** Does `range` accept `version`? Only the shapes we actually write. */
function admits(range, version) {
  if (range === "*" || range === "latest") return false; // floating: never pinned to a release
  const m = /^\^(\d+)\.(\d+)\.(\d+)/.exec(range);
  if (!m) return range === version;
  const [, rMaj, rMin, rPatch] = m.map(Number);
  const v = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!v) return false;
  const [, maj, min, patch] = v.map(Number);
  if (maj !== rMaj) return false;
  // Below 1.0.0 npm treats ^0.x as locked to that minor.
  if (maj === 0) return min === rMin && patch >= rPatch;
  return min > rMin || (min === rMin && patch >= rPatch);
}

const problems = [];

for (const pkg of dependentsOfCore()) {
  const m = readManifest(pkg);
  const range = m.dependencies[CORE.name];
  if (admits(range, coreVersion)) continue;
  problems.push(`${pkg.name} depends on ${CORE.name}@${range}, which excludes ${coreVersion}`);
  if (fix) {
    m.dependencies[CORE.name] = wanted;
    writeManifest(pkg, m);
  }
}

const tpl = readTemplateManifest();
if (tpl) {
  const range = tpl.dependencies?.[CORE.name];
  if (!range) {
    problems.push(`create-loom template does not depend on ${CORE.name}`);
  } else if (!admits(range, coreVersion)) {
    problems.push(
      `create-loom template pins ${CORE.name}@${range}, which excludes ${coreVersion}` +
      (range === "latest" ? ' ("latest" floats -- a scaffold should pin what it was tested against)' : ""),
    );
    if (fix) {
      tpl.dependencies[CORE.name] = wanted;
      writeTemplateManifest(tpl);
    }
  }
}

if (!problems.length) {
  console.log(`version ranges OK (core ${coreVersion})`);
  process.exit(0);
}

for (const p of problems) console.error(`  ${p}`);
if (fix) {
  console.log(`\nRewrote ${problems.length} range(s) to ${wanted}.`);
  process.exit(0);
}
console.error(`\nFAIL: ${problems.length} stale range(s). Run with --fix.`);
process.exit(1);
