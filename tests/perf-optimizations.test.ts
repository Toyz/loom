/**
 * Tests: Performance optimizations
 *
 * Covers: debounced persistence, conditional onBeforeMutate,
 * CollectionStore in-place CRUD.
 */
import { describe, it, expect, vi } from "vitest";
import { Reactive, CollectionStore } from "../src/store/reactive";
import { store } from "../src/store/decorators";
import { watch } from "../src/store/watch";
import { MemoryStorage } from "../src/store/storage";

const tick = () => new Promise<void>(r => queueMicrotask(() => r()));

function createMockElement(proto: any) {
  const el = Object.create(proto);
  el.scheduleUpdate = vi.fn();
  return el;
}

// ── 1. DEBOUNCED PERSISTENCE ──

describe("debounced persistence", () => {
  it("coalesces multiple set() calls into one storage write", async () => {
    const storage = new MemoryStorage();
    const setSpy = vi.spyOn(storage, "set");

    const r = new Reactive(0, { key: "test:debounce", storage });
    r.set(1);
    r.set(2);
    r.set(3);

    // Before microtask — no writes yet
    expect(setSpy).not.toHaveBeenCalled();

    await tick();

    // After microtask — exactly one write with final value
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.get("test:debounce")!)).toBe(3);
  });

  it("coalesces multiple notify() calls into one storage write", async () => {
    const storage = new MemoryStorage();
    const setSpy = vi.spyOn(storage, "set");

    const r = new Reactive({ items: [] as string[] }, { key: "test:notify-debounce", storage });
    const arr = r.peek().items;
    arr.push("a");
    r.notify();
    arr.push("b");
    r.notify();
    arr.push("c");
    r.notify();

    expect(setSpy).not.toHaveBeenCalled();

    await tick();

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.get("test:notify-debounce")!).items).toEqual(["a", "b", "c"]);
  });

  it("fires subscribers synchronously despite debounced persist", () => {
    const storage = new MemoryStorage();
    const sub = vi.fn();

    const r = new Reactive(0, { key: "test:sync-sub", storage });
    r.subscribe(sub);

    r.set(1);
    expect(sub).toHaveBeenCalledTimes(1);
    expect(sub).toHaveBeenCalledWith(1, 0);
  });

  it("debounce works with @store deep proxy mutations", async () => {
    const storage = new MemoryStorage();

    interface State { items: string[]; count: number }

    class MyEl {
      @store<State>({ items: [], count: 0 }, { key: "test:proxy-debounce", storage })
      accessor data!: State;
    }

    const el = createMockElement(MyEl.prototype);
    const setSpy = vi.spyOn(storage, "set");

    el.data.items.push("a");
    el.data.items.push("b");
    el.data.count = 2;

    // Multiple mutations — no persist yet
    expect(setSpy).not.toHaveBeenCalled();

    await tick();

    // One write with all mutations
    expect(setSpy).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(storage.get("test:proxy-debounce")!);
    expect(stored.items).toEqual(["a", "b"]);
    expect(stored.count).toBe(2);
  });

  it("second batch of mutations triggers a second persist", async () => {
    const storage = new MemoryStorage();
    const setSpy = vi.spyOn(storage, "set");

    const r = new Reactive(0, { key: "test:multi-batch", storage });

    r.set(1);
    r.set(2);
    await tick();
    expect(setSpy).toHaveBeenCalledTimes(1);

    // Second batch
    r.set(10);
    r.set(20);
    await tick();
    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.get("test:multi-batch")!)).toBe(20);
  });
});

// ── 2. CONDITIONAL onBeforeMutate ──

describe("conditional onBeforeMutate", () => {
  it("does NOT snapshot when no @watch is registered", () => {
    const cloneSpy = vi.spyOn(globalThis, "structuredClone");
    const callsBefore = cloneSpy.mock.calls.length;

    interface State { n: number }

    class MyEl {
      @store<State>({ n: 0 })
      accessor data!: State;
    }

    const el = createMockElement(MyEl.prototype);
    void el.data; // init
    const callsAfterInit = cloneSpy.mock.calls.length;

    // Mutate — should NOT trigger structuredClone snapshot
    el.data.n = 42;
    expect(cloneSpy.mock.calls.length).toBe(callsAfterInit);

    cloneSpy.mockRestore();
  });

  it("DOES snapshot when @watch is registered", () => {
    const cloneSpy = vi.spyOn(globalThis, "structuredClone");

    interface State { n: number }
    const watchFn = vi.fn();

    class MyEl {
      @store<State>({ n: 0 })
      accessor data!: State;

      @watch("data")
      onChange(v: State, prev: State) { watchFn(v, prev); }
    }

    const el = new MyEl() as any;
    el.scheduleUpdate = vi.fn();
    void el.data; // init
    const callsAfterInit = cloneSpy.mock.calls.length;

    el.data.n = 42;

    // Should have called structuredClone once for the snapshot
    expect(cloneSpy.mock.calls.length).toBeGreaterThan(callsAfterInit);
    expect(watchFn).toHaveBeenCalled();
    const [current, prev] = watchFn.mock.calls[0];
    expect(current.n).toBe(42);
    expect(prev.n).toBe(0);

    cloneSpy.mockRestore();
  });
});

// ── 3. COLLECTIONSTORE IN-PLACE CRUD ──

describe("CollectionStore in-place mutations", () => {
  interface Item { id: string; name: string }

  it("add() uses in-place push", () => {
    const store = new CollectionStore<Item>();
    const arr = store.peek();

    store.add({ name: "first" });

    // Same array reference — not a new array
    expect(store.peek()).toBe(arr);
    expect(store.peek()).toHaveLength(1);
    expect(store.peek()[0].name).toBe("first");
  });

  it("remove() uses in-place splice", () => {
    const store = new CollectionStore<Item>();
    const item = store.add({ name: "a" });
    store.add({ name: "b" });
    const arr = store.peek();

    store.remove(item.id);

    // Same array reference
    expect(store.peek()).toBe(arr);
    expect(store.peek()).toHaveLength(1);
    expect(store.peek()[0].name).toBe("b");
  });

  it("update() uses in-place Object.assign", () => {
    const store = new CollectionStore<Item>();
    const item = store.add({ name: "original" });
    const arr = store.peek();

    const updated = store.update(item.id, { name: "patched" });

    // Same array reference AND same item reference
    expect(store.peek()).toBe(arr);
    expect(updated).toBe(arr[0]);
    expect(updated.name).toBe("patched");
    expect(updated.id).toBe(item.id);
  });

  it("remove() is a no-op for missing id", () => {
    const store = new CollectionStore<Item>();
    store.add({ name: "a" });
    const sub = vi.fn();
    store.subscribe(sub);

    store.remove("nonexistent");
    // Should not notify
    expect(sub).not.toHaveBeenCalled();
    expect(store.peek()).toHaveLength(1);
  });

  it("notifies subscribers on add/remove/update", () => {
    const store = new CollectionStore<Item>();
    const sub = vi.fn();
    store.subscribe(sub);

    const item = store.add({ name: "a" });
    expect(sub).toHaveBeenCalledTimes(1);

    store.update(item.id, { name: "b" });
    expect(sub).toHaveBeenCalledTimes(2);

    store.remove(item.id);
    expect(sub).toHaveBeenCalledTimes(3);
  });

  it("persists with debounced write", async () => {
    const storage = new MemoryStorage();
    const store = new CollectionStore<Item>([], { key: "test:coll", storage });

    store.add({ name: "a" });
    store.add({ name: "b" });

    await tick();
    const stored = JSON.parse(storage.get("test:coll")!);
    expect(stored).toHaveLength(2);
  });
});
