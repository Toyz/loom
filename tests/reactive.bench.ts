/**
 * Reactive core benchmarks
 *
 * Profiles the single hottest path in the library: Reactive.set() and the
 * subscriber notify fanout. Gates the change-detection and reentrancy fixes —
 * the notify scratch buffer is deliberately zero-alloc, so a fix that
 * introduces a per-notify allocation must show up here.
 *
 * Inner loops amplify sub-microsecond per-call work so tinybench can sample
 * (Vitest otherwise records empty samples / NaN hz).
 *
 * Run: npm run bench -- tests/reactive.bench.ts
 */
import { describe, bench } from "vitest";
import { Reactive } from "../src/store/reactive";

/** Repeat per sample so each iteration is measurable */
const LOOP = 2000;

function withSubs(n: number): Reactive<number> {
  const r = new Reactive(0);
  for (let i = 0; i < n; i++) r.subscribe(() => {});
  return r;
}

describe("Reactive.set — subscriber fanout", () => {
  const r0 = withSubs(0);
  const r1 = withSubs(1);
  const r4 = withSubs(4);
  const r16 = withSubs(16);

  bench(`set() — 0 subscribers (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) r0.set(i);
  });

  bench(`set() — 1 subscriber (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) r1.set(i);
  });

  bench(`set() — 4 subscribers (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) r4.set(i);
  });

  bench(`set() — 16 subscribers (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) r16.set(i);
  });
});

describe("Reactive.set — no-op writes", () => {
  const same = withSubs(4);
  same.set(42);

  bench(`set() same value — early exit (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) same.set(42);
  });

  // A NaN-valued reactive: `!==` treats NaN as always-changed, so this used to
  // notify on every write. Object.is makes it an early exit.
  const nan = withSubs(4);
  nan.set(NaN);

  bench(`set() NaN over NaN (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) nan.set(NaN);
  });
});

describe("Reactive — reads", () => {
  const r = new Reactive(7);

  bench(`peek() (x${LOOP})`, () => {
    let acc = 0;
    for (let i = 0; i < LOOP; i++) acc += r.peek();
    if (acc < 0) throw new Error("unreachable");
  });

  bench(`peekVersion() (x${LOOP})`, () => {
    let acc = 0;
    for (let i = 0; i < LOOP; i++) acc += r.peekVersion();
    if (acc < 0) throw new Error("unreachable");
  });

  bench(`.value untraced (x${LOOP})`, () => {
    let acc = 0;
    for (let i = 0; i < LOOP; i++) acc += r.value;
    if (acc < 0) throw new Error("unreachable");
  });
});

describe("Reactive.notify — in-place mutation path", () => {
  const r = withSubs(4);

  bench(`notify() — 4 subscribers (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) r.notify();
  });
});

describe("Reactive — reentrant notify", () => {
  // A subscriber that writes back into the same Reactive: the dispatch loop
  // must not reuse the shared scratch buffer for the nested call.
  const r = new Reactive(0);
  r.subscribe((v) => { if (v < 0) r.set(0); });
  r.subscribe(() => {});
  r.subscribe(() => {});

  bench(`set() triggering a nested set() (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) r.set(i % 2 === 0 ? -1 : 1);
  });
});

describe("Reactive — subscribe/unsubscribe churn", () => {
  const r = new Reactive(0);

  bench(`subscribe + unsubscribe (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) {
      const off = r.subscribe(() => {});
      off();
    }
  });
});
