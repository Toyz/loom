## What changed

<!-- What this does, and why. If it fixes something, say what was broken --
     that is the part that is hard to reconstruct from the diff later. -->

## Verification

<!-- What you ran. CI covers the matrix, but say what you checked by hand,
     especially anything a headless browser cannot show. -->

- [ ] `npm run verify` (versions, types, tests, build, dist resolvable by Node)
- [ ] Tests added for any fix, and confirmed to **fail against the old code**
- [ ] Docs updated if behaviour or an API changed

## Dependencies

- [ ] No new production dependencies (core is zero-dependency; siblings depend
      only on `@toyz/loom`) — CI enforces this, so tick it or explain
- [ ] Any new GitHub Action is pinned to a commit SHA, not a tag

## Breaking changes

<!-- Anything that changes behaviour for existing code, with the migration.
     "None" is a fine answer. -->
