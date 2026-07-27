#!/usr/bin/env node

/**
 * Set a package's version and propagate it to everything that pins it.
 *
 * Releasing used to be: edit a version by hand, commit, then push a tag whose
 * prefix had to match one of six workflows. Nothing checked the tag against
 * the version, so the two could disagree and the wrong thing shipped -- and
 * because bumping core never touched the siblings, their declared ranges drifted
 * to ten minor versions behind.
 *
 *   node scripts/bump.mjs loom minor
 *   node scripts/bump.mjs rpc 0.6.0
 *   node scripts/bump.mjs loom patch --dry-run
 *
 * Prints the resulting version on the last line so a workflow can read it.
 */

import { byId, readManifest, writeManifest, CORE } from "./packages.mjs";
import { execFileSync } from "node:child_process";

const [id, spec, ...rest] = process.argv.slice(2);
const dryRun = rest.includes("--dry-run");

if (!id || !spec) {
  console.error(`
  Usage: node scripts/bump.mjs <package> <patch|minor|major|x.y.z> [--dry-run]
`);
  process.exit(1);
}

let pkg;
try {
  pkg = byId(id);
} catch (e) {
  console.error(`\n  ${e.message}\n`);
  process.exit(1);
}
const manifest = readManifest(pkg);
const current = manifest.version;

function next(version, how) {
  if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(how)) return how;
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m) throw new Error(`Cannot parse current version "${version}"`);
  let [maj, min, patch] = m.slice(1).map(Number);
  if (how === "major") return `${maj + 1}.0.0`;
  if (how === "minor") return `${maj}.${min + 1}.0`;
  if (how === "patch") return `${maj}.${min}.${patch + 1}`;
  throw new Error(`Unknown bump "${how}" -- use patch, minor, major, or an exact version`);
}

const version = next(current, spec);

if (version === current) {
  console.error(`  ${pkg.name} is already ${version}.`);
  process.exit(1);
}

/** Refuse to reuse a version that is already on the registry. */
function alreadyPublished(name, v) {
  try {
    const out = execFileSync("npm", ["view", `${name}@${v}`, "version"], {
      stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8",
    }).trim();
    return out === v;
  } catch {
    return false; // not published, or the registry is unreachable
  }
}

if (alreadyPublished(pkg.name, version)) {
  console.error(`  ${pkg.name}@${version} is already published. Pick a higher version.`);
  process.exit(1);
}

const changes = [`${pkg.name}  ${current} -> ${version}`];

if (!dryRun) {
  manifest.version = version;
  writeManifest(pkg, manifest);
}

// Bumping core moves every range that pins it, including the scaffolder's
// template. check-versions.mjs --fix already knows how; reuse it rather than
// keep a second copy of the rule.
if (pkg.core) {
  const args = ["scripts/check-versions.mjs"];
  if (!dryRun) args.push("--fix");
  try {
    const out = execFileSync("node", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    if (out.trim()) changes.push(out.trim());
  } catch (e) {
    changes.push((e.stdout || "").trim());
  }
}

console.log(changes.join("\n"));
if (dryRun) console.log("(dry run -- nothing written)");
console.log(version);
