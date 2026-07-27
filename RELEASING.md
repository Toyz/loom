# Releasing

Six packages ship from this repo: `@toyz/loom`, `@toyz/loom-rpc`,
`@toyz/loom-analytics`, `@toyz/loom-flags`, `@toyz/loom-placeholder` and
`@toyz/create-loom`.

## Cutting a release

Actions → **Release** → Run workflow.

| Input | |
| --- | --- |
| `package` | `changed` (default), `all`, or one of `loom`, `rpc`, `analytics`, `flags`, `placeholder`, `create-loom` |
| `bump` | `patch`, `minor`, `major`, or `exact` |
| `exact_version` | only when `bump` is `exact`, and only for a single package |
| `dry_run` | run every check, publish nothing |

**`changed`** releases every package modified since its own last release tag,
which is usually what you want after a batch of work: one run, instead of
remembering which of six you touched. **`all`** releases everything regardless.
The chosen `bump` applies to each.

That is the whole process. **Do not create tags by hand** — the workflow pushes
them after a successful publish, so a tag records what shipped rather than
triggering it.

What it does, in order:

1. Resolves the package list, failing early if `changed` finds nothing.
2. Bumps each version, refusing one already on the registry.
3. If core is in the set, rewrites every sibling's `@toyz/loom` range and the
   scaffolder's template pin to match.
4. Runs the gate on each: typecheck, tests, build, and a check that `dist` is
   resolvable by Node.
5. If core or the scaffolder is in the set, scaffolds a project from the packed
   tarballs and runs its install, tests and build.
6. Publishes each with `--provenance`, core first — a sibling that reached npm
   ahead of the core it pins would be unresolvable until core landed.
7. Makes one commit, pushes one `<package>@<version>` tag each, and opens a
   release per package with generated notes.

Start with `dry_run` if you want the gate without the consequences.

### What `changed` will pick

```
node scripts/changed.mjs --explain
```

It compares against each package's newest release tag under either naming
scheme — the `<id>@<version>` tags created now, or the pre-0.22 prefixed ones
(`v*`, `loom-rpc-v*`, ...) that are still the only tags most packages have. A
package that has never been tagged counts as changed. It errs toward including
a package: a lockfile-only change is enough to list one, which is why the plan
is printed before anything is bumped.

### If a release fails partway

`npm publish` is not transactional across packages. If the third of four fails,
the first two are on the registry and no commit or tag was made. Re-run with
those two deselected — `bump.mjs` refuses a version already published, so a
repeat cannot double-publish them.

## Before you release

`npm run verify` runs the same checks locally:

```
npm run verify              # core: versions, types, tests, build, dist
npm run smoke:create-loom   # scaffold a project and run its suite
```

## Checks worth knowing about

**`npm run check:dist`** — every relative import in a built package must carry
its file extension. All five packages shipped extensionless imports until
0.22.0: bundlers resolve them, Node does not, so `import "@toyz/loom"` from
Node or from Vitest resolving a dependency failed with "Cannot find module".
The whole test suite passed throughout, because tests resolve `src/` through
Vite. `moduleResolution` is `nodenext` so tsc now catches it at the source;
this checks the output too.

**`npm run check:versions`** — every declared `@toyz/loom` range must admit the
core version in the tree, and the scaffolder's template must pin it. Three
siblings had drifted to `^0.12.8` against a core at `0.22.0`, because bumping
core never touched them and each builds against a linked local checkout in CI,
so nothing ever resolved the declared range. `--fix` rewrites them.

**`npm run smoke:create-loom`** — packs both tarballs, scaffolds a project from
them, then installs, typechecks, tests and builds it. `create-loom` previously
had no gate of any kind; its workflow was `npm publish` and nothing else.

## Adding a package

Add an entry to [`scripts/packages.mjs`](scripts/packages.mjs). CI's matrix,
the release workflow's dropdown and every check read from that list. There is
no per-package workflow to copy — that pattern is what produced six files that
had each drifted from the others.
