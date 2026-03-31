/**
 * Trace / fine-grained binding benchmarks
 *
 * Profiles hasDirtyDeps, canFastPatch, applyBindings cost when |versions| is large
 * (audit: wide templates that read many reactives per update()).
 *
 * Inner loops amplify sub-microsecond per-call work so tinybench can sample (Vitest
 * otherwise records empty samples / NaN hz).
 *
 * Run: npm run bench -- tests/trace.bench.ts
 */
import { describe, bench } from "vitest";
import { Reactive } from "../src/store/reactive";
import {
  hasDirtyDeps,
  canFastPatch,
  applyBindings,
  type TraceDeps,
  type Binding,
} from "../src/trace";

const DEPS = 200;
/** Repeat per sample so each iteration is measurable */
const LOOP = 400;

function makeReactives(n: number): Reactive<number>[] {
  return Array.from({ length: n }, () => new Reactive(0));
}

/** Snapshot versions, then optionally bump one reactive (simulates one signal change). */
function buildTrace(
  reactives: Reactive<number>[],
  dirtyIndex: number | null,
  withBindings: boolean,
): TraceDeps {
  const deps = new Set<Reactive<number>>(reactives);
  const versions = new Map<Reactive<number>, number>();
  for (const r of reactives) {
    versions.set(r, r.peekVersion());
  }
  if (dirtyIndex !== null) {
    reactives[dirtyIndex].set(1);
  }
  const bindings = new Map<Reactive<number>, Binding[]>();
  if (withBindings) {
    for (const r of reactives) {
      const b: Binding = {
        reactives: new Set([r]),
        target: document.createTextNode(""),
        patcher: () => {
          /* no-op */
        },
      };
      bindings.set(r, [b]);
    }
  }
  return { deps, versions, bindings };
}

describe("trace dependency scans", () => {
  bench(`hasDirtyDeps — ${DEPS} deps, none dirty (×${LOOP} per iter)`, () => {
    const pool = makeReactives(DEPS);
    const trace = buildTrace(pool, null, false);
    for (let i = 0; i < LOOP; i++) hasDirtyDeps(trace);
  });

  bench(`hasDirtyDeps — ${DEPS} deps, first dirty (×${LOOP} per iter)`, () => {
    const reactives = makeReactives(DEPS);
    const trace = buildTrace(reactives, 0, false);
    for (let i = 0; i < LOOP; i++) hasDirtyDeps(trace);
  });

  bench(`canFastPatch — ${DEPS} deps, none dirty, all bindings (×${LOOP} per iter)`, () => {
    const reactives = makeReactives(DEPS);
    const trace = buildTrace(reactives, null, true);
    for (let i = 0; i < LOOP; i++) canFastPatch(trace);
  });

  bench(`canFastPatch — ${DEPS} deps, first dirty, all bindings (×${LOOP} per iter)`, () => {
    const reactives = makeReactives(DEPS);
    const trace = buildTrace(reactives, 0, true);
    for (let i = 0; i < LOOP; i++) canFastPatch(trace);
  });

  bench(`applyBindings — ${DEPS} deps, first dirty, all bindings (×${LOOP} per iter)`, () => {
    const reactives = makeReactives(DEPS);
    const trace = buildTrace(reactives, 0, true);
    for (let i = 0; i < LOOP; i++) applyBindings(trace);
  });
});
