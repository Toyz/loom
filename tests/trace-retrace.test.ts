/**
 * Tests: applyBindings re-traces each patcher.
 *
 * A closure binding's dependency set was captured once, at first render, and
 * never revisited — applyBindings ran the patcher outside any trace. So a
 * conditional closure only ever knew about the branch it took first:
 *
 *   {() => this.flag ? this.a : this.b}   // captures {flag, a}
 *
 * Flipping `flag` fast-patched b's value into the DOM, but `b` was still not a
 * tracked dependency, so later writes to `b` were dropped by the Tier-1
 * hasDirtyDeps check and the node stayed stale forever.
 */

import { describe, it, expect, vi } from "vitest";
import { Reactive } from "../src/store/reactive";
import {
  startTrace, endTrace, addBinding, applyBindings, refreshSnapshots,
  hasDirtyDeps, canFastPatch, isTracing, startSubTrace, endSubTrace,
  type TraceDeps,
} from "../src/trace";

/** Build a trace containing one closure binding, the way the JSX runtime does. */
function traceBinding(target: Node, render: () => string): TraceDeps {
  startTrace();
  startSubTrace();
  (target as Text).textContent = render();
  const deps = endSubTrace();
  addBinding(deps, target, () => { (target as Text).textContent = render(); });
  return endTrace();
}

describe("applyBindings — conditional closure re-tracing", () => {
  it("picks up a reactive first read on a later branch", () => {
    const flag = new Reactive(true);
    const a = new Reactive("A");
    const b = new Reactive("B");
    const node = document.createTextNode("");

    const trace = traceBinding(node, () => (flag.peek() ? a.value : b.value));
    // Read flag through .value so it is traced too.
    expect(node.textContent).toBe("A");

    // Re-trace with flag as a real dep.
    const flagTrace = traceBinding(node, () => (flag.value ? a.value : b.value));
    expect(flagTrace.deps.has(flag)).toBe(true);
    expect(flagTrace.deps.has(a)).toBe(true);
    expect(flagTrace.deps.has(b)).toBe(false); // untaken branch

    // Flip the branch.
    flag.set(false);
    applyBindings(flagTrace);
    refreshSnapshots(flagTrace);
    expect(node.textContent).toBe("B");

    // b must now be a tracked dependency — this is the whole bug.
    expect(flagTrace.deps.has(b)).toBe(true);
    expect(hasDirtyDeps(flagTrace)).toBe(false);

    b.set("B2");
    expect(hasDirtyDeps(flagTrace)).toBe(true);
    applyBindings(flagTrace);
    refreshSnapshots(flagTrace);
    expect(node.textContent).toBe("B2");
  });

  it("drops the dependency it no longer reads", () => {
    const flag = new Reactive(true);
    const a = new Reactive("A");
    const b = new Reactive("B");
    const node = document.createTextNode("");

    const trace = traceBinding(node, () => (flag.value ? a.value : b.value));
    expect(trace.bindings.has(a)).toBe(true);

    flag.set(false);
    applyBindings(trace);
    refreshSnapshots(trace);

    // `a` is no longer read, so its binding list must be gone entirely —
    // an empty-but-present entry would make canFastPatch lie.
    expect(trace.bindings.has(a)).toBe(false);
    expect(trace.bindings.has(b)).toBe(true);
  });

  it("keeps canFastPatch honest after a dep is dropped", () => {
    const flag = new Reactive(true);
    const a = new Reactive("A");
    const b = new Reactive("B");
    const node = document.createTextNode("");

    const trace = traceBinding(node, () => (flag.value ? a.value : b.value));
    flag.set(false);
    applyBindings(trace);
    refreshSnapshots(trace);

    // `a` is dirty but has no binding now → must fall back to a full render.
    a.set("A2");
    expect(canFastPatch(trace)).toBe(false);
  });

  it("leaves an unconditional binding's dep set untouched", () => {
    const count = new Reactive(1);
    const node = document.createTextNode("");

    const trace = traceBinding(node, () => String(count.value));
    const before = trace.bindings.get(count)![0].reactives;

    count.set(2);
    applyBindings(trace);
    refreshSnapshots(trace);

    expect(node.textContent).toBe("2");
    // Same Set instance — the unchanged path must not churn.
    expect(trace.bindings.get(count)![0].reactives).toBe(before);
    expect(trace.bindings.get(count)![0].reactives.has(count)).toBe(true);
  });

  it("survives a binding that ends up reading nothing", () => {
    const flag = new Reactive(true);
    const a = new Reactive("A");
    const node = document.createTextNode("");

    const trace = traceBinding(node, () => (flag.value ? a.value : "static"));
    flag.set(false);

    expect(() => {
      applyBindings(trace);
      refreshSnapshots(trace);
    }).not.toThrow();
    expect(node.textContent).toBe("static");
  });

  it("balances the trace stack when a patcher throws", () => {
    const src = new Reactive(1);
    const node = document.createTextNode("");
    const good = vi.fn();

    startTrace();
    startSubTrace();
    void src.value;
    const deps = endSubTrace();
    addBinding(deps, node, () => { throw new Error("patcher boom"); });
    addBinding(deps, node, () => { void src.value; good(); });
    const trace = endTrace();

    src.set(2);
    expect(() => applyBindings(trace)).toThrow("patcher boom");

    // The sub-trace must have been popped even though the patcher threw.
    expect(isTracing()).toBe(false);
  });

  it("dedups a patcher shared across several dirty deps", () => {
    const a = new Reactive(1);
    const b = new Reactive(2);
    const node = document.createTextNode("");
    const patch = vi.fn(() => { node.textContent = `${a.value}-${b.value}`; });

    startTrace();
    startSubTrace();
    void a.value; void b.value;
    const deps = endSubTrace();
    addBinding(deps, node, patch);
    const trace = endTrace();

    a.set(10);
    b.set(20);
    applyBindings(trace);

    expect(patch).toHaveBeenCalledTimes(1);
  });
});
