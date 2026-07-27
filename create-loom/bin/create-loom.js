#!/usr/bin/env node

/**
 * create-loom -- scaffold a Loom + TypeScript + Vite project.
 *
 * Usage:
 *   npm create @toyz/loom my-app
 *   npm create @toyz/loom .        (scaffold into the current directory)
 *
 * Note the scope. The package is @toyz/create-loom, so `npm create @toyz/loom`
 * is what resolves to it. A bare `npm create loom` resolves to an unscoped
 * `create-loom` on the registry, which is somebody else's package -- and the
 * old usage message here printed exactly that.
 */

import {
  existsSync, mkdirSync, cpSync, renameSync, readFileSync, writeFileSync,
} from "node:fs";
import { resolve, basename, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "..", "template");

/**
 * Dotfiles that ship under an underscore.
 *
 * npm drops a `.gitignore` from the published tarball. It works when you run
 * the scaffolder from a checkout and silently vanishes once it is installed
 * from the registry, which is the worst shape a bug can have. Shipping it as
 * `_gitignore` and renaming on copy is what every other create-* does, for
 * exactly this reason.
 */
const DOTFILES = { _gitignore: ".gitignore" };

/** Files whose presence means the target directory is already a project. */
const CONFLICTS = ["package.json", "index.html", "tsconfig.json", "vite.config.ts", "src"];

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/**
 * Turn a directory name into something npm will accept as a package name.
 *
 * The old version wrote the raw argument straight through, so
 * `npm create @toyz/loom MyApp` produced a package.json npm refuses to publish
 * and warns about on install -- over capitalisation the user only chose for a
 * directory name.
 */
function toPackageName(raw) {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^[._]+/, "")
    .replace(/[^a-z0-9-~]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "loom-app";
}

const arg = process.argv[2];

if (!arg || arg === "--help" || arg === "-h") {
  console.log(`
  Usage: npm create @toyz/loom <project-name>

    npm create @toyz/loom my-app     create ./my-app
    npm create @toyz/loom .          use the current directory
`);
  process.exit(arg ? 0 : 1);
}

const here = arg === ".";
const target = resolve(process.cwd(), arg);
const projectName = toPackageName(here ? basename(process.cwd()) : basename(arg));

if (!here && existsSync(target)) {
  fail(`Directory "${arg}" already exists.`);
}

// Scaffolding into "." skipped every check, so running it in a directory that
// already held a project overwrote package.json and src/ with no warning.
if (here) {
  const present = CONFLICTS.filter((f) => existsSync(join(target, f)));
  if (present.length) {
    fail(
      `The current directory already contains ${present.join(", ")}.\n` +
      `  Scaffolding here would overwrite it. Use a new directory instead:\n\n` +
      `    npm create @toyz/loom my-app`,
    );
  }
}

if (!here) mkdirSync(target, { recursive: true });
cpSync(TEMPLATE_DIR, target, { recursive: true });

for (const [shipped, real] of Object.entries(DOTFILES)) {
  const from = join(target, shipped);
  if (existsSync(from)) renameSync(from, join(target, real));
}

const pkgPath = join(target, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.name = projectName;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

const cd = here ? "" : `cd ${arg}\n    `;
console.log(`
  Created ${projectName} in ${here ? "the current directory" : arg}

  Next:
    ${cd}npm install
    npm run dev

  Also wired: npm test, npm run build, npm run typecheck

  Docs: https://toyz.github.io/loom/
`);
