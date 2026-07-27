/**
 * The package manifest -- one list, read by every script and workflow.
 *
 * There used to be six near-identical publish workflows, each with the build
 * chain pasted in, each with its own tag prefix. Adding a package meant
 * copying a file and remembering to change four strings; three of them shipped
 * without ever running their tests, and one shipped without a build. The list
 * lives here now, and the workflows loop over it.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @typedef {object} Pkg
 * @property {string} id      short name used on the command line and in CI
 * @property {string} name    npm package name
 * @property {string} dir     path relative to the repo root
 * @property {boolean} core   true for @toyz/loom, which the rest build against
 * @property {boolean} builds has a `build` script producing dist/
 * @property {boolean} tests  has a `test` script
 * @property {string[]} paths globs that mean "this package changed"
 * @property {string} legacyTag pre-0.22 tag pattern, still the baseline for
 *   "what changed since the last release" until each package has been cut once
 *   under the `<id>@<version>` scheme
 */

/** @type {Pkg[]} */
export const PACKAGES = [
  {
    id: "loom",
    name: "@toyz/loom",
    dir: ".",
    core: true,
    builds: true,
    tests: true,
    paths: ["src/**", "tests/**", "package.json", "tsconfig.json", "vitest.config.ts"],
    legacyTag: "v*",
  },
  {
    id: "rpc",
    name: "@toyz/loom-rpc",
    dir: "loom-rpc",
    core: false,
    builds: true,
    tests: true,
    paths: ["loom-rpc/**"],
    legacyTag: "loom-rpc-v*",
  },
  {
    id: "analytics",
    name: "@toyz/loom-analytics",
    dir: "loom-analytics",
    core: false,
    builds: true,
    tests: true,
    paths: ["loom-analytics/**"],
    legacyTag: "loom-analytics-v*",
  },
  {
    id: "flags",
    name: "@toyz/loom-flags",
    dir: "loom-flags",
    core: false,
    builds: true,
    tests: true,
    paths: ["loom-flags/**"],
    legacyTag: "loom-flags-v*",
  },
  {
    id: "placeholder",
    name: "@toyz/loom-placeholder",
    dir: "loom-placeholder",
    core: false,
    builds: true,
    tests: true,
    paths: ["loom-placeholder/**"],
    legacyTag: "loom-placeholder-v*",
  },
  {
    id: "create-loom",
    name: "@toyz/create-loom",
    // No build and no source to typecheck -- it is a copier and a template.
    // Its gate is a real scaffold-and-run, in scripts/verify.mjs.
    dir: "create-loom",
    core: false,
    builds: false,
    tests: false,
    paths: ["create-loom/**"],
    legacyTag: "create-loom-v*",
  },
];

export const CORE = PACKAGES.find((p) => p.core);

/** Look up a package by its short id, exiting with a usable message if absent. */
export function byId(id) {
  const pkg = PACKAGES.find((p) => p.id === id);
  if (!pkg) {
    const known = PACKAGES.map((p) => p.id).join(", ");
    throw new Error(`Unknown package "${id}". Known: ${known}`);
  }
  return pkg;
}

/** Absolute path to a package's package.json. */
export const manifestPath = (pkg) => join(ROOT, pkg.dir, "package.json");

export function readManifest(pkg) {
  return JSON.parse(readFileSync(manifestPath(pkg), "utf-8"));
}

/** Write a manifest back, preserving npm's 2-space + trailing-newline shape. */
export function writeManifest(pkg, json) {
  writeFileSync(manifestPath(pkg), JSON.stringify(json, null, 2) + "\n");
}

/** Every package that declares a dependency on @toyz/loom. */
export function dependentsOfCore() {
  return PACKAGES.filter((p) => {
    if (p.core) return false;
    const m = readManifest(p);
    return Boolean(m.dependencies?.[CORE.name]);
  });
}

/**
 * The scaffolder pins @toyz/loom for every project it generates, so it is a
 * consumer of the core version like any sibling -- just one file deeper.
 */
export const TEMPLATE_MANIFEST = join(ROOT, "create-loom", "template", "package.json");

export function readTemplateManifest() {
  if (!existsSync(TEMPLATE_MANIFEST)) return null;
  return JSON.parse(readFileSync(TEMPLATE_MANIFEST, "utf-8"));
}

export function writeTemplateManifest(json) {
  writeFileSync(TEMPLATE_MANIFEST, JSON.stringify(json, null, 2) + "\n");
}
