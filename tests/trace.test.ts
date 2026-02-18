import { describe, it, expect, vi } from "vitest";
import { Reactive } from "../src/store/reactive";
import {
  startTrace,
  endTrace,
  isTracing,
  hasDirtyDeps,
  refreshSnapshots,
} from "../src/trace";

describe("Traced Template Projection", () => {
  describe("startTrace / endTrace", () => {
    it("activates and deactivates tracing", () => {
      expect(isTracing()).toBe(false);
      startTrace();
      expect(isTracing()).toBe(true);
      endTrace();
      expect(isTracing()).toBe(false);
    });

    it("captures Reactive reads during a trace", () => {
      const a = new Reactive(1);
      const b = new Reactive("hello");

      startTrace();
      void a.value;
      void b.value;
      const deps = endTrace();

      expect(deps.deps.size).toBe(2);
      expect(deps.deps.has(a)).toBe(true);
      expect(deps.deps.has(b)).toBe(true);
    });

    it("does not capture reads outside of a trace", () => {
      const a = new Reactive(1);
      void a.value; // no trace active

      startTrace();
      const deps = endTrace();
      expect(deps.deps.size).toBe(0);
    });

    it("deduplicates multiple reads of the same Reactive", () => {
      const a = new Reactive(1);

      startTrace();
      void a.value;
      void a.value;
      void a.value;
      const deps = endTrace();

      expect(deps.deps.size).toBe(1);
    });

    it("snapshots versions at trace end", () => {
      const a = new Reactive(42);
      const b = new Reactive("world");

      startTrace();
      void a.value;
      void b.value;
      const deps = endTrace();

      expect(deps.versions.get(a)).toBe(0);
      expect(deps.versions.get(b)).toBe(0);
    });
  });

  describe("hasDirtyDeps", () => {
    it("returns true for null (first render)", () => {
      expect(hasDirtyDeps(null)).toBe(true);
    });

    it("returns false when no dependency changed", () => {
      const a = new Reactive(1);
      const b = new Reactive("x");

      startTrace();
      void a.value;
      void b.value;
      const deps = endTrace();

      expect(hasDirtyDeps(deps)).toBe(false);
    });

    it("returns true when a dependency value changed", () => {
      const a = new Reactive(1);

      startTrace();
      void a.value;
      const deps = endTrace();

      a.set(2);
      expect(hasDirtyDeps(deps)).toBe(true);
    });

    it("returns false after refreshSnapshots", () => {
      const a = new Reactive(1);

      startTrace();
      void a.value;
      const deps = endTrace();

      a.set(2);
      expect(hasDirtyDeps(deps)).toBe(true);

      refreshSnapshots(deps);
      expect(hasDirtyDeps(deps)).toBe(false);
    });
  });

  describe("peek()", () => {
    it("reads value without triggering tracing", () => {
      const a = new Reactive(99);

      startTrace();
      const val = a.peek();
      const deps = endTrace();

      expect(val).toBe(99);
      expect(deps.deps.size).toBe(0);
    });
  });

  describe("notify()", () => {
    it("fires subscribers without changing reference", () => {
      const obj = { count: 0 };
      const r = new Reactive(obj);
      const fn = vi.fn();
      r.subscribe(fn);

      obj.count = 5;
      r.notify();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(obj, obj);
      expect(r.value.count).toBe(5);
    });
  });

  describe("integration: dependency-based skip", () => {
    it("skips update when unrelated reactive changes", () => {
      const used = new Reactive("shown");
      const unused = new Reactive("hidden");
      const updateFn = vi.fn(() => used.value);

      // First render — trace dependencies
      startTrace();
      updateFn();
      const deps = endTrace();

      expect(deps.deps.has(used)).toBe(true);
      expect(deps.deps.has(unused)).toBe(false); // not captured — never read
      expect(deps.deps.size).toBe(1);

      // Simulate: unused reactive changes
      unused.set("changed");

      // Fast path check: no tracked dep dirty → skip
      expect(hasDirtyDeps(deps)).toBe(false);

      // Simulate: used reactive changes
      used.set("updated");
      expect(hasDirtyDeps(deps)).toBe(true);

      // Re-render and re-trace
      startTrace();
      updateFn();
      const deps2 = endTrace();

      expect(updateFn).toHaveBeenCalledTimes(2); // only called when deps dirty
      expect(deps2.versions.get(used)).toBe(1);
    });

    it("detects dirty on notify() (in-place mutation)", () => {
      const obj = { count: 0 };
      const r = new Reactive(obj);

      startTrace();
      void r.value;
      const deps = endTrace();

      expect(hasDirtyDeps(deps)).toBe(false);

      // In-place mutation + notify (like @store deep proxy)
      obj.count = 5;
      r.notify();

      expect(hasDirtyDeps(deps)).toBe(true);
    });
  });
});
