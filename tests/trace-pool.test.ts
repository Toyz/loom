/**
 * Tests: trace.ts optimizations — pool recycling, buffer reuse, for...of paths
 *
 * Edge cases for the performance changes:
 *   - releaseTrace returns structures to pools
 *   - Pooled structures are correctly reused (no stale data)
 *   - applyBindings with pooled _toRunBuf handles multiple cycles
 *   - endSubTrace for...of merge works with empty and large sets
 */
import { describe, it, expect, vi } from "vitest";
import { Reactive } from "../src/store/reactive";
import {
  startTrace,
  endTrace,
  isTracing,
  hasDirtyDeps,
  refreshSnapshots,
  releaseTrace,
  canFastPatch,
  applyBindings,
  startSubTrace,
  endSubTrace,
  addBinding,
} from "../src/trace";

describe("trace pool recycling", () => {
  it("releaseTrace clears deps, versions, and bindings", () => {
    const a = new Reactive(1);
    const b = new Reactive(2);

    startTrace();
    void a.value;
    void b.value;
    const trace = endTrace();

    expect(trace.deps.size).toBe(2);
    expect(trace.versions.size).toBe(2);

    releaseTrace(trace);

    // After release, the sets/maps should be cleared
    expect(trace.deps.size).toBe(0);
    expect(trace.versions.size).toBe(0);
    expect(trace.bindings.size).toBe(0);
  });

  it("released structures are reused in subsequent traces", () => {
    const a = new Reactive(1);

    // First trace — capture and release
    startTrace();
    void a.value;
    const trace1 = endTrace();
    const depsRef = trace1.deps;
    const versRef = trace1.versions;
    releaseTrace(trace1);

    // Second trace — should reuse the pooled sets
    startTrace();
    void a.value;
    const trace2 = endTrace();

    // The pool may or may not return the exact same object depending on
    // ordering, but at minimum the structures should be clean
    expect(trace2.deps.size).toBe(1);
    expect(trace2.versions.size).toBe(1);
    expect(trace2.deps.has(a)).toBe(true);
  });

  it("reused structures contain no stale data from previous trace", () => {
    const a = new Reactive("first");
    const b = new Reactive("second");

    // First trace with both
    startTrace();
    void a.value;
    void b.value;
    const trace1 = endTrace();
    releaseTrace(trace1);

    // Second trace with only 'a' — should NOT contain 'b'
    startTrace();
    void a.value;
    const trace2 = endTrace();

    expect(trace2.deps.size).toBe(1);
    expect(trace2.deps.has(a)).toBe(true);
    expect(trace2.deps.has(b)).toBe(false);
    expect(trace2.versions.has(b)).toBe(false);

    releaseTrace(trace2);
  });

  it("releaseTrace handles empty trace (no deps or bindings)", () => {
    startTrace();
    const trace = endTrace();

    expect(trace.deps.size).toBe(0);
    expect(trace.versions.size).toBe(0);
    expect(trace.bindings.size).toBe(0);

    // Should not throw
    expect(() => releaseTrace(trace)).not.toThrow();
  });

  it("releaseTrace handles trace with bindings", () => {
    const a = new Reactive(1);
    const node = document.createElement("span");

    startTrace();
    void a.value;

    // Add a binding
    startSubTrace();
    void a.value;
    const subDeps = endSubTrace();
    addBinding(subDeps, node, () => {});

    const trace = endTrace();

    expect(trace.bindings.size).toBeGreaterThan(0);

    // Should clear everything including binding arrays
    releaseTrace(trace);
    expect(trace.bindings.size).toBe(0);
  });

  it("multiple release/reuse cycles don't corrupt state", () => {
    const reactives = Array.from({ length: 5 }, (_, i) => new Reactive(i));

    for (let cycle = 0; cycle < 10; cycle++) {
      startTrace();
      // Read a different subset each cycle
      for (let i = 0; i <= cycle % reactives.length; i++) {
        void reactives[i].value;
      }
      const trace = endTrace();

      const expectedSize = (cycle % reactives.length) + 1;
      expect(trace.deps.size).toBe(expectedSize);
      expect(trace.versions.size).toBe(expectedSize);

      // Dirty check should work correctly
      expect(hasDirtyDeps(trace)).toBe(false);
      reactives[0].set((cycle + 1) * 100);
      expect(hasDirtyDeps(trace)).toBe(true);
      refreshSnapshots(trace);
      expect(hasDirtyDeps(trace)).toBe(false);

      releaseTrace(trace);
    }
  });
});

describe("applyBindings pooled buffer", () => {
  it("handles multiple applyBindings calls without leaking between calls", () => {
    const a = new Reactive(1);
    const b = new Reactive(2);
    const nodeA = document.createElement("span");
    const nodeB = document.createElement("span");
    const patcherA = vi.fn(() => { nodeA.textContent = String(a.peek()); });
    const patcherB = vi.fn(() => { nodeB.textContent = String(b.peek()); });

    // Build trace with bindings
    startTrace();
    startSubTrace();
    void a.value;
    const depsA = endSubTrace();
    addBinding(depsA, nodeA, patcherA);

    startSubTrace();
    void b.value;
    const depsB = endSubTrace();
    addBinding(depsB, nodeB, patcherB);

    const trace = endTrace();

    // First apply — only 'a' dirty
    a.set(10);
    applyBindings(trace);
    expect(patcherA).toHaveBeenCalledTimes(1);
    expect(patcherB).toHaveBeenCalledTimes(0);

    refreshSnapshots(trace);

    // Second apply — only 'b' dirty
    b.set(20);
    applyBindings(trace);
    expect(patcherA).toHaveBeenCalledTimes(1); // not called again
    expect(patcherB).toHaveBeenCalledTimes(1);

    releaseTrace(trace);
  });

  it("deduplicates patchers that depend on multiple dirty reactives", () => {
    const a = new Reactive(1);
    const b = new Reactive(2);
    const node = document.createElement("span");
    const sharedPatcher = vi.fn();

    startTrace();
    startSubTrace();
    void a.value;
    void b.value;
    const deps = endSubTrace();
    addBinding(deps, node, sharedPatcher);
    const trace = endTrace();

    // Both dirty — patcher should only fire once
    a.set(10);
    b.set(20);
    applyBindings(trace);
    expect(sharedPatcher).toHaveBeenCalledTimes(1);

    releaseTrace(trace);
  });
});

describe("endSubTrace for...of merge", () => {
  it("merges empty sub-trace into parent", () => {
    startTrace();
    const a = new Reactive(1);
    void a.value;

    startSubTrace();
    // Read nothing in sub-trace
    const captured = endSubTrace();

    expect(captured.size).toBe(0);

    const trace = endTrace();
    // Parent should still have 'a'
    expect(trace.deps.size).toBe(1);
    expect(trace.deps.has(a)).toBe(true);

    releaseTrace(trace);
  });

  it("merges large sub-trace into parent", () => {
    const reactives = Array.from({ length: 50 }, (_, i) => new Reactive(i));

    startTrace();
    // Read one in parent
    void reactives[0].value;

    // Read all 50 in sub-trace
    startSubTrace();
    for (const r of reactives) void r.value;
    const captured = endSubTrace();

    expect(captured.size).toBe(50);

    const trace = endTrace();
    // Parent should have all 50 merged in
    expect(trace.deps.size).toBe(50);
    for (const r of reactives) {
      expect(trace.deps.has(r)).toBe(true);
    }

    releaseTrace(trace);
  });

  it("handles nested sub-traces", () => {
    const a = new Reactive("a");
    const b = new Reactive("b");
    const c = new Reactive("c");

    startTrace();
    void a.value;

    startSubTrace();
    void b.value;

    startSubTrace();
    void c.value;
    endSubTrace(); // merges 'c' into middle trace

    const middleCaptured = endSubTrace(); // merges 'b'+'c' into parent
    expect(middleCaptured.has(b)).toBe(true);
    expect(middleCaptured.has(c)).toBe(true);

    const trace = endTrace();
    expect(trace.deps.size).toBe(3);
    expect(trace.deps.has(a)).toBe(true);
    expect(trace.deps.has(b)).toBe(true);
    expect(trace.deps.has(c)).toBe(true);

    releaseTrace(trace);
  });
});
