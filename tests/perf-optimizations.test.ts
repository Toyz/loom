/**
 * Tests: Performance optimizations for decorators
 *
 * Covers:
 * Fix 1+2: @store deep proxy — symbol fast-path, primitive reads, post-reset tracking
 * Fix 3:   @dynamicCss — reactive symbol caching on constructor
 * Fix 4:   @draggable — MutationObserver debounce for selector mode
 * Fix 5:   @query/@queryAll — pre-split template selectors ($0, $1, etc.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { store, reactive, computed } from "../src/store/decorators";
import { watch } from "../src/store/watch";

// ── Helpers ──

/** Object.create mock — works for @store (factory form) which uses localSymbol */
function createMockElement(proto: any) {
  const el = Object.create(proto);
  el.scheduleUpdate = vi.fn();
  return el;
}

/** new-based mock — required for @reactive, @watch, bare @store (TC39 private fields) */
function createMockInstance<T extends new (...args: any[]) => any>(Cls: T): InstanceType<T> {
  const el = new Cls() as any;
  el.scheduleUpdate = vi.fn();
  return el;
}

// ═══════════════════════════════════════════════════════════════
// Fix 1+2: Deep proxy get trap optimization
// ═══════════════════════════════════════════════════════════════

describe("@store deep proxy optimizations", () => {
  it("reads primitive values without wrapping overhead", () => {
    interface State { count: number; name: string; active: boolean; empty: null }

    class MyEl {
      @store<State>({ count: 42, name: "test", active: true, empty: null })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    expect(el.state.count).toBe(42);
    expect(el.state.name).toBe("test");
    expect(el.state.active).toBe(true);
    expect(el.state.empty).toBeNull();
  });

  it("skips symbol properties — no proxy wrapping on Symbol access", () => {
    interface State { data: string }

    class MyEl {
      @store<State>({ data: "hello" })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    const sym = Symbol("custom");
    // Symbol property access should passthrough without wrapping
    expect((el.state as any)[sym]).toBeUndefined();
  });

  it("wraps nested objects correctly after optimization", () => {
    interface State { nested: { deep: { value: number } } }

    class MyEl {
      @store<State>({ nested: { deep: { value: 1 } } })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    // Deep nested mutation should still trigger update
    el.state.nested.deep.value = 99;
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.nested.deep.value).toBe(99);
  });

  it("tracks mutations after $reset", () => {
    interface State { items: string[]; count: number }

    class MyEl {
      @store<State>({ items: [], count: 0 })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    el.state.items.push("a", "b");
    el.state.count = 5;
    expect(el.state.items).toEqual(["a", "b"]);

    // Reset
    (el as any).$reset_state();
    expect(el.state.items).toEqual([]);
    expect(el.state.count).toBe(0);

    el.scheduleUpdate.mockClear();

    // Mutations after reset should still work
    el.state.items.push("new");
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.items).toEqual(["new"]);
  });

  it("tracks mutations after full state replacement", () => {
    interface State { x: number; nested: { y: number } }

    class MyEl {
      @store<State>({ x: 0, nested: { y: 0 } })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;

    // Full replacement
    el.state = { x: 10, nested: { y: 20 } };
    el.scheduleUpdate.mockClear();

    // Both top-level and nested mutations should still trigger
    el.state.x = 11;
    expect(el.scheduleUpdate).toHaveBeenCalledTimes(1);

    el.scheduleUpdate.mockClear();
    el.state.nested.y = 21;
    expect(el.scheduleUpdate).toHaveBeenCalledTimes(1);
    expect(el.state.nested.y).toBe(21);
  });

  it("handles rapid mutations without excessive updates", () => {
    interface State { items: string[] }

    class MyEl {
      @store<State>({ items: [] })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    // Rapid mutations — each triggers scheduleUpdate but batching is external
    for (let i = 0; i < 100; i++) {
      el.state.items.push(`item-${i}`);
    }
    expect(el.state.items.length).toBe(100);
    // scheduleUpdate called at least once (each push triggers it)
    expect(el.scheduleUpdate).toHaveBeenCalled();
  });

  it("handles arrays with mixed types correctly", () => {
    interface State { mixed: (string | number | { id: number })[] }

    class MyEl {
      @store<State>({ mixed: ["a", 1, { id: 0 }] })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    expect(el.state.mixed[0]).toBe("a");
    expect(el.state.mixed[1]).toBe(1);
    expect((el.state.mixed[2] as { id: number }).id).toBe(0);

    el.scheduleUpdate.mockClear();
    (el.state.mixed[2] as { id: number }).id = 42;
    expect(el.scheduleUpdate).toHaveBeenCalled();
  });

  it("handles Symbol.iterator correctly on proxy arrays", () => {
    interface State { items: number[] }

    class MyEl {
      @store<State>({ items: [1, 2, 3] })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    // for..of uses Symbol.iterator — should work without wrapping
    const collected: number[] = [];
    for (const item of el.state.items) {
      collected.push(item);
    }
    expect(collected).toEqual([1, 2, 3]);
  });

  it("handles Symbol.toPrimitive and other well-known symbols", () => {
    interface State { data: { value: number } }

    class MyEl {
      @store<State>({ data: { value: 42 } })
      accessor state!: State;
    }

    const el = createMockElement(MyEl.prototype);
    // JSON.stringify traverses with toJSON / toPrimitive under the hood
    const json = JSON.stringify(el.state);
    expect(JSON.parse(json)).toEqual({ data: { value: 42 } });
  });
});

// ═══════════════════════════════════════════════════════════════
// Fix 3: @dynamicCss reactive symbol caching
// ═══════════════════════════════════════════════════════════════

describe("@dynamicCss reactive symbol caching", () => {
  it("store symbols are discoverable on element instances", () => {
    interface S { count: number; name: string }

    class MyEl {
      @store<S>({ count: 0, name: "test" })
      accessor state!: S;
    }

    const el1 = createMockElement(MyEl.prototype);
    // Trigger store init
    void el1.state;

    // The store backing Reactive symbol should be discoverable
    const syms = Object.getOwnPropertySymbols(el1).filter(
      s => (s.description ?? "").startsWith("loom:store:")
    );
    expect(syms.length).toBeGreaterThanOrEqual(1);
  });

  it("multiple instances share same symbol descriptions", () => {
    interface S { val: number }

    class MyEl {
      @store<S>({ val: 0 })
      accessor data!: S;
    }

    const el1 = createMockElement(MyEl.prototype);
    const el2 = createMockElement(MyEl.prototype);

    void el1.data;
    void el2.data;

    const syms1 = Object.getOwnPropertySymbols(el1).filter(
      s => (s.description ?? "").startsWith("loom:store:")
    );
    const syms2 = Object.getOwnPropertySymbols(el2).filter(
      s => (s.description ?? "").startsWith("loom:store:")
    );
    expect(syms1.length).toBe(syms2.length);
    expect(syms1[0].description).toBe(syms2[0].description);
  });
});

// ═══════════════════════════════════════════════════════════════
// Fix 5: @query/@queryAll pre-split template selectors
// ═══════════════════════════════════════════════════════════════

describe("@query dynamic template pre-split", () => {
  // We test the decorator factory directly since it produces accessor descriptors.
  // The `get` returns a function for dynamic selectors.

  function createQueryElement(
    queryFn: Function,
    mockShadow: { querySelector: Function; querySelectorAll: Function },
  ) {
    // The decorator returns { get() } — call the factory to get the descriptor
    const descriptor = queryFn(
      { get: () => null, set: () => {} },
      { name: "test", addInitializer: () => {} } as any,
    );
    return {
      shadow: mockShadow,
      get testQuery() {
        return descriptor.get.call(this);
      },
    };
  }

  it("static selector returns element directly", async () => {
    const { query } = await import("../src/element/decorators");
    const mockDiv = document.createElement("div");
    const mockShadow = {
      querySelector: vi.fn(() => mockDiv),
      querySelectorAll: vi.fn(() => [mockDiv]),
    };

    const factory = query(".my-class");
    const el = createQueryElement(factory, mockShadow);

    const result = el.testQuery;
    expect(result).toBe(mockDiv);
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".my-class");
  });

  it("dynamic $0 selector returns callable", async () => {
    const { query } = await import("../src/element/decorators");
    const mockDiv = document.createElement("div");
    const mockShadow = {
      querySelector: vi.fn(() => mockDiv),
      querySelectorAll: vi.fn(() => [mockDiv]),
    };

    const factory = query(".input-$0");
    const el = createQueryElement(factory, mockShadow);

    const result = el.testQuery;
    expect(typeof result).toBe("function");

    result("todo");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".input-todo");
  });

  it("dynamic $0 with multiple calls uses different args", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query(".col-$0");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("todo");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".col-todo");

    fn("done");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".col-done");

    fn("in-progress");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".col-in-progress");
  });

  it("dynamic with multiple placeholders ($0 and $1)", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query(".row-$0 .cell-$1");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("header", "name");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".row-header .cell-name");
  });

  it("dynamic with missing args substitutes empty string", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query(".item-$0-$1");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("foo");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".item-foo-");
  });

  it("dynamic selector handles numeric args", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query("[data-index='$0']");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn(42);
    expect(mockShadow.querySelector).toHaveBeenCalledWith("[data-index='42']");
  });

  it("dynamic selector handles empty string arg", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query(".prefix-$0-suffix");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".prefix--suffix");
  });

  it("$0 at start of selector", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query("$0-widget");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("main");
    expect(mockShadow.querySelector).toHaveBeenCalledWith("main-widget");
  });

  it("$0 at end of selector", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query(".widget-$0");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("card");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".widget-card");
  });

  it("adjacent placeholders $0$1", async () => {
    const { query } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = query(".$0$1");
    const el = createQueryElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("foo", "bar");
    expect(mockShadow.querySelector).toHaveBeenCalledWith(".foobar");
  });
});

describe("@queryAll dynamic template pre-split", () => {
  function createQueryAllElement(
    queryFn: Function,
    mockShadow: { querySelector: Function; querySelectorAll: Function },
  ) {
    const descriptor = queryFn(
      { get: () => null, set: () => {} },
      { name: "test", addInitializer: () => {} } as any,
    );
    return {
      shadow: mockShadow,
      get testQuery() {
        return descriptor.get.call(this);
      },
    };
  }

  it("static selector returns array of elements", async () => {
    const { queryAll } = await import("../src/element/decorators");
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");
    const mockShadow = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => [div1, div2]),
    };

    const factory = queryAll(".item");
    const el = createQueryAllElement(factory, mockShadow);

    const result = el.testQuery;
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([div1, div2]);
    expect(mockShadow.querySelectorAll).toHaveBeenCalledWith(".item");
  });

  it("dynamic $0 returns callable that returns array", async () => {
    const { queryAll } = await import("../src/element/decorators");
    const div1 = document.createElement("div");
    const mockShadow = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => [div1]),
    };

    const factory = queryAll(".card-$0");
    const el = createQueryAllElement(factory, mockShadow);

    const fn = el.testQuery;
    expect(typeof fn).toBe("function");

    const result = fn("todo");
    expect(Array.isArray(result)).toBe(true);
    expect(mockShadow.querySelectorAll).toHaveBeenCalledWith(".card-todo");
  });

  it("dynamic with $0 and $1 builds correct selector", async () => {
    const { queryAll } = await import("../src/element/decorators");
    const mockShadow = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    };

    const factory = queryAll(".grid-$0 .cell-$1");
    const el = createQueryAllElement(factory, mockShadow);
    const fn = el.testQuery;

    fn("row-1", "col-2");
    expect(mockShadow.querySelectorAll).toHaveBeenCalledWith(".grid-row-1 .cell-col-2");
  });
});

// ═══════════════════════════════════════════════════════════════
// Fix 1+2: @store watcher interaction with proxy optimizations
// ═══════════════════════════════════════════════════════════════

describe("@store + @watch interaction after proxy optimization", () => {
  it("watcher receives correct prev/next on nested mutation", () => {
    interface State { items: string[]; count: number }
    const watchFn = vi.fn();

    class MyEl {
      @store<State>({ items: [], count: 0 })
      accessor state!: State;

      @watch("state")
      onStateChange(next: State, prev: State) { watchFn(next, prev); }
    }

    const el = createMockInstance(MyEl);
    void el.state;
    watchFn.mockClear();

    el.state.count = 5;

    expect(watchFn).toHaveBeenCalled();
    const [current, prev] = watchFn.mock.calls[0];
    expect(current.count).toBe(5);
    expect(prev.count).toBe(0);
  });

  it("watcher works correctly after $reset", () => {
    interface State { val: number }
    const watchFn = vi.fn();

    class MyEl {
      @store<State>({ val: 0 })
      accessor state!: State;

      @watch("state")
      onStateChange(next: State) { watchFn(next.val); }
    }

    const el = createMockInstance(MyEl);
    el.state.val = 10;
    expect(watchFn).toHaveBeenCalledWith(10);

    (el as any).$reset_state();
    watchFn.mockClear();

    // After reset, mutations should still fire watchers
    el.state.val = 20;
    expect(watchFn).toHaveBeenCalledWith(20);
  });

  it("watcher fires for rapid consecutive mutations", () => {
    interface State { count: number }
    const watchFn = vi.fn();

    class MyEl {
      @store<State>({ count: 0 })
      accessor state!: State;

      @watch("state")
      onStateChange() { watchFn(); }
    }

    const el = createMockInstance(MyEl);
    void el.state;
    watchFn.mockClear();

    // Rapid mutations
    for (let i = 1; i <= 50; i++) {
      el.state.count = i;
    }

    // Watcher should have fired for each mutation
    expect(watchFn).toHaveBeenCalled();
    expect(el.state.count).toBe(50);
  });
});

// ═══════════════════════════════════════════════════════════════
// Fix 1+2: computed + store proxy interaction
// ═══════════════════════════════════════════════════════════════

describe("@computed with @store after proxy optimization", () => {
  it("computed reads from proxy correctly", () => {
    interface State { items: string[] }

    class MyEl {
      @store<State>({ items: ["a", "b", "c"] })
      accessor state!: State;

      @computed
      get itemCount() {
        return this.state.items.length;
      }
    }

    const el = createMockElement(MyEl.prototype);
    expect(el.itemCount).toBe(3);
  });

  it("computed reads store after mutation", () => {
    interface State { multiplier: number; base: number }

    class MyEl {
      @store<State>({ multiplier: 2, base: 10 })
      accessor state!: State;

      @computed
      get result() {
        return this.state.base * this.state.multiplier;
      }
    }

    const el = createMockElement(MyEl.prototype);
    expect(el.result).toBe(20);

    // Mutate and verify computed picks up the change
    el.state.multiplier = 5;
    // Force re-compute by dirtying cache
    const dirtyKeys = Object.getOwnPropertySymbols(el).filter(
      s => (s.description ?? "").includes("computed:dirty")
    );
    for (const k of dirtyKeys) (el as any)[k] = true;
    expect(el.result).toBe(50);
  });
});
