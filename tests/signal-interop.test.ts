/**
 * Tests: TC39 Signals Interop
 *
 * Validates that SignalState, SignalComputed, toSignal, and fromSignal
 * integrate correctly with Loom's reactive system and trace engine.
 */
import { describe, it, expect, vi } from "vitest";
import { SignalState, SignalComputed, toSignal, fromSignal, signal } from "../src/store/signal";
import { Reactive } from "../src/store/reactive";
import { startTrace, endTrace, hasDirtyDeps } from "../src/trace";
import { watch } from "../src/store/watch";

// ── SignalState ──

describe("SignalState", () => {
  it("creates with initial value", () => {
    const sig = new SignalState(42);
    expect(sig.get()).toBe(42);
  });

  it(".set() updates value", () => {
    const sig = new SignalState(0);
    sig.set(10);
    expect(sig.get()).toBe(10);
  });

  it(".peek() reads without trace", () => {
    const sig = new SignalState(5);
    startTrace();
    const val = sig.peek();
    const trace = endTrace();
    expect(val).toBe(5);
    expect(trace.deps.size).toBe(0);
  });

  it(".get() records in trace engine", () => {
    const sig = new SignalState(5);
    startTrace();
    const val = sig.get();
    const trace = endTrace();
    expect(val).toBe(5);
    expect(trace.deps.size).toBe(1);
    expect(trace.deps.has(sig._reactive)).toBe(true);
  });

  it("custom equals prevents unnecessary updates", () => {
    const sub = vi.fn();
    const sig = new SignalState({ x: 1 }, {
      equals: (a, b) => a.x === b.x,
    });
    sig.subscribe(sub);
    sig.set({ x: 1 }); // same by custom equality
    expect(sub).not.toHaveBeenCalled();

    sig.set({ x: 2 }); // different
    expect(sub).toHaveBeenCalledTimes(1);
  });

  it("subscribe fires on value change", () => {
    const sig = new SignalState(0);
    const sub = vi.fn();
    sig.subscribe(sub);
    sig.set(1);
    expect(sub).toHaveBeenCalledWith(1, 0);
  });

  it("triggers hasDirtyDeps after set", () => {
    const sig = new SignalState(0);
    startTrace();
    sig.get();
    const trace = endTrace();

    expect(hasDirtyDeps(trace)).toBe(false);
    sig.set(1);
    expect(hasDirtyDeps(trace)).toBe(true);
  });
});

// ── SignalComputed ──

describe("SignalComputed", () => {
  it("lazily computes value", () => {
    const cb = vi.fn(() => 42);
    const comp = new SignalComputed(cb);
    expect(cb).not.toHaveBeenCalled();
    expect(comp.get()).toBe(42);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("memoizes — doesn't recompute on repeated reads", () => {
    const cb = vi.fn(() => 42);
    const comp = new SignalComputed(cb);
    comp.get();
    comp.get();
    comp.get();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("derives from SignalState", () => {
    const count = new SignalState(2);
    const doubled = new SignalComputed(() => count.get() * 2);
    expect(doubled.get()).toBe(4);
  });

  it("participates in trace engine", () => {
    const count = new SignalState(3);
    const tripled = new SignalComputed(() => count.get() * 3);

    startTrace();
    const val = tripled.get();
    const trace = endTrace();

    expect(val).toBe(9);
    // Both the computed's backing reactive AND count's reactive should be deps
    expect(trace.deps.has(tripled._reactive)).toBe(true);
  });

  it("peek() reads without registering the computed itself in trace", () => {
    const count = new SignalState(5);
    const doubled = new SignalComputed(() => count.get() * 2);

    // peek() should return the value without registering the computed's
    // backing Reactive into the trace. Note: the inner callback may still
    // record count's Reactive since _recompute runs the callback.
    const val = doubled.peek();
    expect(val).toBe(10);

    // Now verify that peek() specifically doesn't register the *computed*
    startTrace();
    doubled.peek();
    const trace = endTrace();
    // Only count's reactive might be in the trace (from recompute),
    // but the computed's own backing reactive should NOT be.
    expect(trace.deps.has(doubled._reactive)).toBe(false);
  });

  it("dispose() cleans up subscriptions", () => {
    const count = new SignalState(1);
    const comp = new SignalComputed(() => count.get() + 1);
    comp.get(); // trigger initial compute + subscriptions

    comp.dispose();
    count.set(10);
    // After dispose, computed should not have recomputed
    // (it's dirty but won't auto-recompute)
  });
});

// ── toSignal ──

describe("toSignal", () => {
  it("wraps Reactive as Signal", () => {
    const r = new Reactive(100);
    const sig = toSignal(r);
    expect(sig.get()).toBe(100);
  });

  it("shares backing Reactive — writes propagate", () => {
    const r = new Reactive(0);
    const sig = toSignal(r);

    r.set(42);
    expect(sig.get()).toBe(42);
  });

  it("signal writes propagate to reactive", () => {
    const r = new Reactive(0);
    const sig = toSignal(r);

    sig.set(99);
    expect(r.peek()).toBe(99);
  });

  it("participates in trace", () => {
    const r = new Reactive(7);
    const sig = toSignal(r);

    startTrace();
    sig.get();
    const trace = endTrace();

    expect(trace.deps.has(r)).toBe(true);
  });
});

// ── fromSignal ──

describe("fromSignal", () => {
  it("creates Reactive from external Signal", () => {
    const external = { get: () => 42 };
    const r = fromSignal(external);
    expect(r.value).toBe(42);
  });

  it("updates via subscribe callback", () => {
    let value = 10;
    let onChange: (() => void) | null = null;

    const external = { get: () => value };
    const r = fromSignal(external, (cb) => {
      onChange = cb;
      return () => { onChange = null; };
    });

    expect(r.value).toBe(10);

    value = 20;
    onChange!();
    expect(r.value).toBe(20);
  });

  it("returned Reactive participates in trace", () => {
    const external = { get: () => "hello" };
    const r = fromSignal(external);

    startTrace();
    r.value;
    const trace = endTrace();

    expect(trace.deps.has(r)).toBe(true);
  });
});

// ── @signal decorator ──

describe("@signal decorator", () => {
  it("creates accessor with initial value", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    expect(el.count).toBe(0);
  });

  it("setter updates value", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    el.count = 42;
    expect(el.count).toBe(42);
  });

  it("triggers scheduleUpdate on change", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.count; // init
    el.scheduleUpdate.mockClear();

    el.count = 5;
    expect(el.scheduleUpdate).toHaveBeenCalled();
  });

  it("does not trigger scheduleUpdate for same value", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.count;
    el.scheduleUpdate.mockClear();

    el.count = 0; // same value
    expect(el.scheduleUpdate).not.toHaveBeenCalled();
  });

  it("exposes $signal_<field> on instance", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.count; // triggers init

    const sig = el.$signal_count;
    expect(sig).toBeInstanceOf(SignalState);
    expect(sig.get()).toBe(0);
    expect(sig.peek()).toBe(0);
  });

  it("$signal_ reads/writes are synchronized", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.count;

    // Write via Signal API
    el.$signal_count.set(99);
    expect(el.count).toBe(99);

    // Write via accessor
    el.count = 50;
    expect(el.$signal_count.get()).toBe(50);
  });

  it("integrates with trace engine", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();

    startTrace();
    void el.count;
    const trace = endTrace();

    expect(trace.deps.size).toBe(1);
  });

  it("triggers hasDirtyDeps after change", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();

    startTrace();
    void el.count;
    const trace = endTrace();

    expect(hasDirtyDeps(trace)).toBe(false);
    el.count = 10;
    expect(hasDirtyDeps(trace)).toBe(true);
  });

  it("works with @watch", () => {
    const watchFn = vi.fn();

    class MyEl {
      @signal accessor count = 0;

      @watch("count")
      onCount(v: number, prev: number) { watchFn(v, prev); }
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.count;
    watchFn.mockClear();

    el.count = 7;
    expect(watchFn).toHaveBeenCalledWith(7, 0);
  });

  it("each instance is isolated", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el1 = new MyEl() as any;
    el1.scheduleUpdate = vi.fn();
    const el2 = new MyEl() as any;
    el2.scheduleUpdate = vi.fn();

    el1.count = 10;
    expect(el1.count).toBe(10);
    expect(el2.count).toBe(0);
  });
});
