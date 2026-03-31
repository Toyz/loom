/**
 * LoomVirtual-related hot-path benchmarks (synchronous)
 *
 * Mirrors the O(n) offset loop and renderWindow fragment build from
 * [src/element/virtual.ts](src/element/virtual.ts) without async mount/tinybench
 * quirks (async bench tasks were collecting zero samples in Vitest 4).
 *
 * For full-component stress with real shadow DOM + rAF, see virtual-stress.test.ts.
 *
 * Run: npm run bench -- tests/virtual.bench.ts
 */
import { describe, bench } from "vitest";

/** Same loop as LoomVirtual.rebuildOffsets (cold cache → estimated height only) */
function rebuildOffsetsLike(n: number, estimatedHeight: number, heightCache: Map<number, number>): number {
  const offsets: number[] = new Array(n + 1);
  offsets[0] = 0;
  for (let i = 0; i < n; i++) {
    offsets[i + 1] = offsets[i] + (heightCache.get(i) ?? estimatedHeight);
  }
  return offsets[n]!;
}

describe("loom-virtual (hot-loop mirrors)", () => {
  const N = 10_000;
  const WIN = 45;

  bench(`rebuildOffsets-like (${N} items, cold cache)`, () => {
    const heightCache = new Map<number, number>();
    rebuildOffsetsLike(N, 28, heightCache);
  });

  bench(`rebuildOffsets-like (${N} items, warm cache)`, () => {
    const heightCache = new Map<number, number>();
    for (let i = 0; i < N; i++) heightCache.set(i, 24 + (i % 9));
    rebuildOffsetsLike(N, 28, heightCache);
  });

  /** Approximates renderWindow inner loop: build fragment of visible rows */
  bench(`fragment build (${WIN} row divs)`, () => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < WIN; i++) {
      const d = document.createElement("div");
      d.textContent = String(i);
      d.style.minHeight = `${20 + (i % 8)}px`;
      frag.appendChild(d);
    }
    const host = document.createElement("div");
    host.appendChild(frag);
  });

  bench(`getBoundingClientRect × ${WIN} (detached tree)`, () => {
    const host = document.createElement("div");
    for (let i = 0; i < WIN; i++) {
      const d = document.createElement("div");
      d.textContent = String(i);
      host.appendChild(d);
    }
    const children = host.children;
    for (let i = 0; i < children.length; i++) {
      void children[i]!.getBoundingClientRect().height;
    }
  });
});
