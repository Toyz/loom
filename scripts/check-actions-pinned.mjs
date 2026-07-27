#!/usr/bin/env node

/**
 * Every GitHub Action must be pinned to a commit SHA.
 *
 * `uses: actions/checkout@v4` is a *mutable pointer*. Whoever controls that
 * repository -- or anyone who takes over a maintainer account -- can repoint
 * the tag at new code, and every workflow in the world picks it up on its next
 * run. No dependency file changes, no diff to review, no version to notice.
 * That is the shape of most Actions supply-chain compromises: not a flaw in
 * the action, a change of what the tag means.
 *
 * A 40-character commit SHA cannot be repointed. The trailing `# v5` comment
 * keeps it readable and is what a bot updates.
 *
 * This matters more here than in an app, because these workflows hold a token
 * that can publish to npm under your name.
 *
 *   node scripts/check-actions-pinned.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./packages.mjs";

/** `uses:` lines that point at something other than a full commit SHA. */
const USES = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/;
const SHA = /^[0-9a-f]{40}$/;

function ymlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...ymlFiles(full));
    else if (/\.ya?ml$/.test(entry)) out.push(full);
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of ymlFiles(join(ROOT, ".github"))) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    const m = USES.exec(line);
    if (!m) return;
    const ref = m[1];

    // A local action is this repository's own code, reviewed with everything
    // else, so there is nothing to pin it to.
    if (ref.startsWith("./") || ref.startsWith("../")) return;

    checked++;
    const at = ref.lastIndexOf("@");
    const version = at === -1 ? "" : ref.slice(at + 1);
    if (!SHA.test(version)) {
      problems.push(
        `  ${file.slice(ROOT.length + 1)}:${i + 1}  ${ref}\n` +
        `      pinned to a tag, which the action's owner can repoint at any time`,
      );
    }
  });
}

if (problems.length) {
  console.error("\nActions must be pinned to a commit SHA:\n");
  console.error(problems.join("\n"));
  console.error(
    "\nResolve one with:\n" +
    "  gh api repos/OWNER/REPO/git/ref/tags/TAG -q .object.sha\n" +
    "and write it as `uses: OWNER/REPO@<sha> # TAG`.\n",
  );
  process.exit(1);
}

console.log(`all ${checked} third-party action reference(s) pinned to a SHA`);
