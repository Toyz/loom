#!/usr/bin/env node

/**
 * Which packages have changed since their last release?
 *
 * The release workflow's `changed` option uses this so a release can be "ship
 * whatever moved" rather than six separate runs where you have to remember
 * which ones you touched.
 *
 * A package's baseline is its newest release tag, under either scheme: the
 * `<id>@<version>` tags this repo creates now, or the pre-0.22 prefixed ones
 * (`v*`, `loom-rpc-v*`, ...) that are still the only tags most packages have.
 * With no tag at all, everything counts as changed -- the safe reading for a
 * package that has never shipped.
 *
 *   node scripts/changed.mjs           # one id per line
 *   node scripts/changed.mjs --json    # JSON array, for a workflow matrix
 *   node scripts/changed.mjs --explain # show the baseline and the files
 */

import { execFileSync } from "node:child_process";
import { PACKAGES, CORE, ROOT } from "./packages.mjs";

const json = process.argv.includes("--json");
const explain = process.argv.includes("--explain");

const git = (args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Newest release tag for a package, across both naming schemes. */
function baseline(pkg) {
  const candidates = [];
  for (const pattern of [`${pkg.id}@*`, pkg.legacyTag]) {
    if (!pattern) continue;
    let out = "";
    try {
      out = git(["tag", "-l", pattern, "--sort=-creatordate"]);
    } catch {
      continue;
    }
    const newest = out.split("\n").filter(Boolean)[0];
    if (newest) candidates.push(newest);
  }
  if (!candidates.length) return null;
  // Both schemes may be present during the changeover; take whichever tag is
  // most recent by commit date, not by which pattern we happened to try first.
  candidates.sort((a, b) => Number(git(["log", "-1", "--format=%ct", b])) - Number(git(["log", "-1", "--format=%ct", a])));
  return candidates[0];
}

/** Files under this package's paths that changed since `tag`. */
function changedFiles(pkg, tag) {
  const out = git(["diff", "--name-only", `${tag}..HEAD`, "--", ...pkg.paths]);
  return out ? out.split("\n").filter(Boolean) : [];
}

const results = [];

for (const pkg of PACKAGES) {
  const tag = baseline(pkg);
  if (!tag) {
    results.push({ pkg, tag: null, files: ["(never released)"] });
    continue;
  }
  const files = changedFiles(pkg, tag);
  if (files.length) results.push({ pkg, tag, files });
}

// Core first, then the rest in manifest order: a sibling built against a core
// that has not published yet would resolve the previous version from the
// registry, so ordering here is load-bearing, not cosmetic.
results.sort((a, b) => Number(b.pkg.core) - Number(a.pkg.core));

if (explain) {
  if (!results.length) console.log("Nothing has changed since the last release.");
  for (const { pkg, tag, files } of results) {
    console.log(`\n${pkg.id}  (since ${tag ?? "the beginning"})`);
    for (const f of files.slice(0, 12)) console.log(`  ${f}`);
    if (files.length > 12) console.log(`  ... and ${files.length - 12} more`);
  }
  process.exit(0);
}

const ids = results.map((r) => r.pkg.id);
console.log(json ? JSON.stringify(ids) : ids.join("\n"));
