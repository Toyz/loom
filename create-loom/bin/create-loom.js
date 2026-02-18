#!/usr/bin/env node

/**
 * create-loom — Scaffold a Loom + TypeScript + Vite project.
 *
 * Usage:
 *   npm create loom my-app
 *   npx create-loom my-app
 *   npx create-loom .          (current directory)
 */

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "..", "template");

const name = process.argv[2];

if (!name) {
  console.error("\n  Usage: npm create loom <project-name>\n");
  process.exit(1);
}

const target = resolve(process.cwd(), name);
const projectName = name === "." ? basename(process.cwd()) : basename(name);

// Guard against overwriting
if (name !== "." && existsSync(target)) {
  console.error(`\n  Directory "${name}" already exists.\n`);
  process.exit(1);
}

// Copy template
if (name !== ".") mkdirSync(target, { recursive: true });
cpSync(TEMPLATE_DIR, target, { recursive: true });

// Patch project name into package.json
const pkgPath = join(target, "package.json");
const pkg = readFileSync(pkgPath, "utf-8");
writeFileSync(pkgPath, pkg.replace(/"name": "loom-app"/, `"name": "${projectName}"`));

console.log(`
  ✨ Loom project created in ${name === "." ? "current directory" : name}

  Get started:
    ${name !== "." ? `cd ${name}` : ""}
    npm install
    npm run dev

  Weave the web with Loom
`);
