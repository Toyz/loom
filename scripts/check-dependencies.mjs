#!/usr/bin/env node

/**
 * Core has no production dependencies; a sibling has exactly one.
 *
 * The rule is not aesthetic. Every production dependency is code that ships to
 * everyone who installs the package, running with whatever rights the install
 * has -- and a package you chose once can change hands to someone you have
 * never heard of. The npm registry's worst incidents have not been flaws in
 * popular packages; they have been popular packages quietly becoming somebody
 * else's.
 *
 * Zero is the only count that needs no ongoing judgement.
 *
 * Writes the offending list to GITHUB_OUTPUT so CI can quote it back on the
 * pull request rather than leaving a red X and a log to go read.
 */

import { appendFileSync } from "node:fs";
import { PACKAGES, readManifest, CORE } from "./packages.mjs";

const violations = [];

for (const pkg of PACKAGES) {
  const deps = Object.keys(readManifest(pkg).dependencies ?? {});
  // The scaffolder's own manifest has no dependencies; its template's pin on
  // @toyz/loom is checked by check-versions.mjs instead.
  const allowed = pkg.core ? [] : [CORE.name];
  const extra = deps.filter((d) => !allowed.includes(d));
  for (const d of extra) violations.push(`${pkg.name}  ->  ${d}`);
}

if (process.env.GITHUB_OUTPUT) {
  // Multi-line values need the delimiter form.
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `violations<<__EOF__\n${violations.join("\n")}\n__EOF__\n`,
  );
}

if (violations.length) {
  console.error("\nProduction dependencies are not allowed here:\n");
  for (const v of violations) console.error(`  ${v}`);
  console.error("\nMove them to devDependencies, or write it by hand.\n");
  process.exit(1);
}

console.log(`dependencies clean across ${PACKAGES.length} packages`);
