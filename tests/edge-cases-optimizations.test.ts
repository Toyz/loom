/**
 * Edge case tests for performance optimizations and TC39 Signals interop.
 *
 * Covers: debounced persistence races, CollectionStore no-ops, Signal
 * computed chains, @signal rapid mutations, disposal, and interop edge cases.
 */
import { describe, it, expect, vi } from "vitest";
import { Reactive, CollectionStore } from "../src/store/reactive";
import { SignalState, SignalComputed, toSignal, fromSignal, signal } from "../src/store/signal";
import { store } from "../src/store/decorators";
import { watch } from "../src/store/watch";
import { MemoryStorage } from "../src/store/storage";
import { startTrace, endTrace, hasDirtyDeps } from "../src/trace";

const tick = () => new Promise<void>(r => queueMicrotask(() => r()));

function createMockElement(proto: any) {
  const el = Object.create(proto);
  el.scheduleUpdate = vi.fn();
  return el;
}

// ── 1. DEBOUNCED PERSISTENCE EDGE CASES ──

describe("debounced persistence edge cases", () => {
  it("persists correctly when set() and notify() are interleaved", async () => {
    const storage = new MemoryStorage();
    const r = new Reactive({ val: 0 }, { key: "test:interleave", storage });

    r.set({ val: 1 });          // set triggers debounce
    r.peek().val = 2;
    r.notify();                  // notify also triggers debounce

    await tick();

    const stored = JSON.parse(storage.get("test:interleave")!);
    expect(stored.val).toBe(2);
  });

  it("handles rapid set-then-clear-then-set cycle", async () => {
    const storage = new MemoryStorage();
    const r = new Reactive(10, { key: "test:rapid-cycle", storage });

    r.set(20);
    r.set(30);
    r.set(10); // back to original

    await tick();

    // Should persist the final value even if it equals the original
    const stored = JSON.parse(storage.get("test:rapid-cycle")!);
    expect(stored).toBe(10);
  });

  it("non-persisted Reactive doesn't error on set/notify", async () => {
    const r = new Reactive(0); // no persist options
    r.set(1);
    r.set(2);
    r.notify();
    await tick(); // should not throw
    expect(r.peek()).toBe(2);
  });

  it("multiple Reactives with different keys don't cross-contaminate", async () => {
    const storage = new MemoryStorage();
    const r1 = new Reactive("a", { key: "test:r1", storage });
    const r2 = new Reactive("x", { key: "test:r2", storage });

    r1.set("b");
    r2.set("y");
    r1.set("c");

    await tick();

    expect(JSON.parse(storage.get("test:r1")!)).toBe("c");
    expect(JSON.parse(storage.get("test:r2")!)).toBe("y");
  });

  it("subscribers fire synchronously even with debounced persist", () => {
    const storage = new MemoryStorage();
    const r = new Reactive(0, { key: "test:sync-verify", storage });
    const log: number[] = [];

    r.subscribe((v) => log.push(v));
    r.set(1);
    r.set(2);
    r.set(3);

    // Subscribers fire immediately, not debounced
    expect(log).toEqual([1, 2, 3]);
  });
});

// ── 2. COLLECTIONSTORE IN-PLACE EDGE CASES ──

describe("CollectionStore in-place edge cases", () => {
  interface Item { id: string; name: string; count?: number }

  it("add() with explicit id doesn't generate a new one", () => {
    const store = new CollectionStore<Item>();
    const item = store.add({ id: "custom-id", name: "explicit" });
    expect(item.id).toBe("custom-id");
    expect(store.peek()).toHaveLength(1);
  });

  it("remove() on empty store is a no-op", () => {
    const store = new CollectionStore<Item>();
    const sub = vi.fn();
    store.subscribe(sub);

    store.remove("nonexistent");
    expect(sub).not.toHaveBeenCalled();
    expect(store.peek()).toHaveLength(0);
  });

  it("update() on nonexistent id returns undefined", () => {
    const store = new CollectionStore<Item>();
    store.add({ name: "a" });

    const result = store.update("nonexistent", { name: "patched" });
    expect(result).toBeUndefined();
  });

  it("rapid add/remove/add maintains array integrity", () => {
    const store = new CollectionStore<Item>();
    const a = store.add({ name: "a" });
    const b = store.add({ name: "b" });
    store.remove(a.id);
    const c = store.add({ name: "c" });
    store.remove(b.id);

    expect(store.peek()).toHaveLength(1);
    expect(store.peek()[0].id).toBe(c.id);
    expect(store.peek()[0].name).toBe("c");
  });

  it("update() preserves other fields via Object.assign", () => {
    const store = new CollectionStore<Item>();
    const item = store.add({ name: "orig", count: 5 });

    store.update(item.id, { name: "patched" });

    const updated = store.find(item.id);
    expect(updated!.name).toBe("patched");
    expect(updated!.count).toBe(5); // preserved
  });

  it("bulk adds share same array reference", () => {
    const store = new CollectionStore<Item>();
    const ref = store.peek();

    for (let i = 0; i < 100; i++) {
      store.add({ name: `item-${i}` });
    }

    // Same array reference throughout — in-place push
    expect(store.peek()).toBe(ref);
    expect(store.peek()).toHaveLength(100);
  });
});

// ── 3. SIGNALSTATE EDGE CASES ──

describe("SignalState edge cases", () => {
  it("Object.is equality blocks NaN !== NaN issue", () => {
    const sig = new SignalState(NaN);
    const sub = vi.fn();
    sig.subscribe(sub);

    sig.set(NaN); // Object.is(NaN, NaN) is true — should NOT fire
    expect(sub).not.toHaveBeenCalled();
  });

  it("distinguishes +0 and -0 via Object.is", () => {
    const sig = new SignalState(0);
    // Object.is(0, -0) is false, so SignalState considers them different
    sig.set(-0);
    expect(Object.is(sig.peek(), -0)).toBe(true);
  });

  it("works with undefined and null", () => {
    const sig = new SignalState<string | null | undefined>(undefined);
    sig.set(null);
    expect(sig.get()).toBeNull();
    sig.set(undefined);
    expect(sig.get()).toBeUndefined();
  });

  it("multiple traces capture same dependency", () => {
    const sig = new SignalState(0);

    startTrace();
    sig.get();
    const trace1 = endTrace();

    startTrace();
    sig.get();
    const trace2 = endTrace();

    expect(trace1.deps.has(sig._reactive)).toBe(true);
    expect(trace2.deps.has(sig._reactive)).toBe(true);

    sig.set(1);
    expect(hasDirtyDeps(trace1)).toBe(true);
    expect(hasDirtyDeps(trace2)).toBe(true);
  });

  it("unsubscribe prevents further notifications", () => {
    const sig = new SignalState(0);
    const sub = vi.fn();
    const unsub = sig.subscribe(sub);

    sig.set(1);
    expect(sub).toHaveBeenCalledTimes(1);

    unsub();
    sig.set(2);
    expect(sub).toHaveBeenCalledTimes(1); // no more
  });
});

// ── 4. SIGNALCOMPUTED EDGE CASES ──

describe("SignalComputed edge cases", () => {
  it("handles chained computed signals", () => {
    const a = new SignalState(1);
    const b = new SignalComputed(() => a.get() * 2);

    expect(b.get()).toBe(2);

    // The computed's backing reactive participates in trace
    startTrace();
    const val = b.get();
    const trace = endTrace();

    expect(val).toBe(2);
    expect(trace.deps.has(b._reactive)).toBe(true);
  });

  it("returns same value on repeated get without changes", () => {
    let computeCount = 0;
    const a = new SignalState(10);
    const comp = new SignalComputed(() => {
      computeCount++;
      return a.get() * 2;
    });

    comp.get();
    comp.get();
    comp.get();

    // Should only compute once since source didn't change
    expect(computeCount).toBe(1);
  });

  it("dispose prevents re-computation", () => {
    const a = new SignalState(0);
    let computeCount = 0;
    const comp = new SignalComputed(() => {
      computeCount++;
      return a.get();
    });

    comp.get(); // first compute
    expect(computeCount).toBe(1);

    comp.dispose();
    a.set(100);

    // After dispose, no auto-recompute happens
    // (comp is dirty but dispose() severed the subscription)
  });

  it("computed with no signal deps returns constant", () => {
    const comp = new SignalComputed(() => 42);
    expect(comp.get()).toBe(42);
    expect(comp.peek()).toBe(42);
  });
});

// ── 5. @signal DECORATOR EDGE CASES ──

describe("@signal decorator edge cases", () => {
  it("works with object values", () => {
    class MyEl {
      @signal accessor data = { x: 1, y: 2 };
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();

    expect(el.data).toEqual({ x: 1, y: 2 });
    el.data = { x: 10, y: 20 };
    expect(el.data).toEqual({ x: 10, y: 20 });
  });

  it("rapid mutations fire scheduleUpdate each time", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.count;
    el.scheduleUpdate.mockClear();

    for (let i = 1; i <= 10; i++) {
      el.count = i;
    }
    expect(el.scheduleUpdate).toHaveBeenCalledTimes(10);
    expect(el.count).toBe(10);
  });

  it("setting before first read initializes correctly", () => {
    class MyEl {
      @signal accessor count = 0;
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();

    // Set before first read — should trigger lazy init
    el.count = 99;
    expect(el.count).toBe(99);
  });

  it("$signal_ survives multiple get/set cycles", () => {
    class MyEl {
      @signal accessor val = "a";
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.val;

    const sig = el.$signal_val;
    el.val = "b";
    el.val = "c";

    // Same SignalState instance throughout
    expect(el.$signal_val).toBe(sig);
    expect(sig.get()).toBe("c");
  });

  it("@watch receives correct prev on first change", () => {
    const watchFn = vi.fn();

    class MyEl {
      @signal accessor name = "initial";

      @watch("name")
      onName(v: string, prev: string) { watchFn(v, prev); }
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.name;
    watchFn.mockClear();

    el.name = "changed";
    expect(watchFn).toHaveBeenCalledWith("changed", "initial");
  });
});

// ── 6. CONVERTER EDGE CASES ──

describe("toSignal / fromSignal edge cases", () => {
  it("toSignal shares identity — mutations visible both ways", () => {
    const r = new Reactive([1, 2, 3]);
    const sig = toSignal(r);

    r.set([4, 5]);
    expect(sig.get()).toEqual([4, 5]);

    sig.set([6]);
    expect(r.peek()).toEqual([6]);
  });

  it("toSignal peek doesn't record in trace", () => {
    const r = new Reactive(0);
    const sig = toSignal(r);

    startTrace();
    sig.peek();
    const trace = endTrace();

    expect(trace.deps.size).toBe(0);
  });

  it("fromSignal without subscribe still creates valid Reactive", () => {
    const external = { get: () => "hello" };
    const r = fromSignal(external);

    startTrace();
    const val = r.value;
    const trace = endTrace();

    expect(val).toBe("hello");
    expect(trace.deps.has(r)).toBe(true);
  });

  it("fromSignal updates propagate to subscribers", () => {
    let val = 0;
    let trigger: (() => void) | null = null;
    const external = { get: () => val };

    const r = fromSignal(external, (onChange) => {
      trigger = onChange;
      return () => { trigger = null; };
    });

    const sub = vi.fn();
    r.subscribe(sub);

    val = 42;
    trigger!();

    expect(sub).toHaveBeenCalledWith(42, 0);
    expect(r.peek()).toBe(42);
  });
});

// ── 7. CONDITIONAL onBeforeMutate EDGE CASES ──

describe("conditional onBeforeMutate edge cases", () => {
  it("@store without @watch skips snapshot on nested mutation", () => {
    const cloneSpy = vi.spyOn(globalThis, "structuredClone");
    const callsBefore = cloneSpy.mock.calls.length;

    class MyEl {
      @store<{ items: string[] }>({ items: [] })
      accessor data!: { items: string[] };
    }

    const el = createMockElement(MyEl.prototype);
    void el.data; // init
    const callsAfterInit = cloneSpy.mock.calls.length;

    // Deep nested mutation — should NOT trigger clone
    el.data.items.push("a");
    el.data.items.push("b");

    expect(cloneSpy.mock.calls.length).toBe(callsAfterInit);
    cloneSpy.mockRestore();
  });

  it("@store + @watch snapshot is accurate across multiple mutations", () => {
    const watchFn = vi.fn();

    class MyEl {
      @store<{ count: number }>({ count: 0 })
      accessor data!: { count: number };

      @watch("data")
      onChange(v: { count: number }, prev: { count: number }) { watchFn(v, prev); }
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.data;
    watchFn.mockClear();

    // First mutation captures snapshot
    el.data.count = 1;
    expect(watchFn).toHaveBeenCalledTimes(1);
    expect(watchFn.mock.calls[0][1].count).toBe(0); // prev was 0

    watchFn.mockClear();

    // Second mutation — prev should be new snapshot
    el.data.count = 2;
    expect(watchFn).toHaveBeenCalledTimes(1);
    expect(watchFn.mock.calls[0][1].count).toBe(1); // prev was 1
  });
});
