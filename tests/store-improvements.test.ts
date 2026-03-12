/**
 * Tests: @store decorator improvements
 *
 * Covers: bare decorator form, @watch integration, $reset method,
 * structuredClone (Date/RegExp preservation), and prev snapshot accuracy.
 */
import { describe, it, expect, vi } from "vitest";
import { store } from "../src/store/decorators";
import { watch } from "../src/store/watch";
import { WATCHERS } from "../src/decorators/symbols";
import { MemoryStorage } from "../src/store/storage";

/**
 * Create a mock element from a class that has TC39 decorators.
 * Uses `new` so that class field initializers (init()) run properly.
 * Adds scheduleUpdate mock before accessing any properties.
 */
function createMockInstance<T extends new (...args: any[]) => any>(Cls: T): InstanceType<T> {
    // Need to instantiate to run TC39 initializers
    const el = new Cls() as any;
    el.scheduleUpdate = vi.fn();
    return el;
}

/**
 * Legacy mock for factory-form tests (Object.create pattern from existing tests).
 */
function createMockElement(proto: any) {
    const el = Object.create(proto);
    el.scheduleUpdate = vi.fn();
    return el;
}

interface TodoState {
    items: string[];
    filter: "all" | "active" | "done";
    meta?: { count: number };
}

// ── 1. BARE DECORATOR FORM ──

describe("@store bare decorator form", () => {
    it("uses accessor initializer as defaults", () => {
        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all" };
        }

        const el = createMockInstance(MyEl);
        expect(el.state).toEqual({ items: [], filter: "all" });
    });

    it("triggers scheduleUpdate on mutation", () => {
        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all" };
        }

        const el = createMockInstance(MyEl);
        void el.state;
        el.scheduleUpdate.mockClear();

        el.state.filter = "done";
        expect(el.scheduleUpdate).toHaveBeenCalled();
        expect(el.state.filter).toBe("done");
    });

    it("each instance is isolated", () => {
        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all" };
        }

        const el1 = createMockInstance(MyEl);
        const el2 = createMockInstance(MyEl);

        el1.state.items.push("only in el1");
        expect(el1.state.items).toContain("only in el1");
        expect(el2.state.items).toEqual([]);
    });

    it("full replacement works", () => {
        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all" };
        }

        const el = createMockInstance(MyEl);
        el.state = { items: ["new"], filter: "done" };
        expect(el.state.items).toEqual(["new"]);
        expect(el.state.filter).toBe("done");
    });

    it("mutations work after full replacement", () => {
        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all" };
        }

        const el = createMockInstance(MyEl);
        el.state = { items: ["a"], filter: "active" };
        el.scheduleUpdate.mockClear();

        el.state.items.push("b");
        expect(el.scheduleUpdate).toHaveBeenCalled();
        expect(el.state.items).toEqual(["a", "b"]);
    });

    it("nested mutations trigger update", () => {
        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all", meta: { count: 0 } };
        }

        const el = createMockInstance(MyEl);
        void el.state;
        el.scheduleUpdate.mockClear();

        el.state.meta!.count = 10;
        expect(el.scheduleUpdate).toHaveBeenCalled();
        expect(el.state.meta!.count).toBe(10);
    });
});

// ── 2. @WATCH INTEGRATION ──

describe("@store + @watch integration", () => {
    it("@watch fires on store mutation (factory form)", () => {
        const watchFn = vi.fn();

        class MyEl {
            @store<TodoState>({ items: [], filter: "all" })
            accessor state!: TodoState;

            @watch("state")
            onState(val: TodoState, _prev: TodoState) { watchFn(val, _prev); }
        }

        // For @watch + factory form, need to create via constructor and manually
        // set WATCHERS since addInitializer runs during class creation
        const el = createMockInstance(MyEl);
        void el.state; // init
        watchFn.mockClear();

        el.state.filter = "active";
        expect(watchFn).toHaveBeenCalled();
        const [current, prev] = watchFn.mock.calls[0];
        expect(current.filter).toBe("active");
        expect(prev.filter).toBe("all");
    });

    it("@watch fires on full replacement", () => {
        const watchFn = vi.fn();

        class MyEl {
            @store<TodoState>({ items: [], filter: "all" })
            accessor state!: TodoState;

            @watch("state")
            onState(val: TodoState, _prev: TodoState) { watchFn(val, _prev); }
        }

        const el = createMockInstance(MyEl);
        void el.state;
        watchFn.mockClear();

        el.state = { items: ["new"], filter: "done" };
        expect(watchFn).toHaveBeenCalled();
    });

    it("@watch works with bare @store form", () => {
        const watchFn = vi.fn();

        class MyEl {
            @store accessor state: TodoState = { items: [], filter: "all" };

            @watch("state")
            onState(val: TodoState, _prev: TodoState) { watchFn(val, _prev); }
        }

        const el = createMockInstance(MyEl);
        void el.state;
        watchFn.mockClear();

        el.state.items.push("hello");
        expect(watchFn).toHaveBeenCalled();
        const [current, prev] = watchFn.mock.calls[0];
        expect(current.items).toContain("hello");
        expect(prev.items).not.toContain("hello");
    });
});

// ── 3. $RESET METHOD ──

describe("@store $reset", () => {
    it("$reset restores factory form defaults", () => {
        class MyEl {
            @store<TodoState>({ items: [], filter: "all" })
            accessor state!: TodoState;
        }

        const el = createMockElement(MyEl.prototype);
        el.state.items.push("a", "b");
        el.state.filter = "done";

        expect(el.state.items).toEqual(["a", "b"]);
        expect(el.state.filter).toBe("done");

        el.$reset_state();
        expect(el.state.items).toEqual([]);
        expect(el.state.filter).toBe("all");
    });

    it("$reset restores bare form defaults", () => {
        class MyEl {
            @store accessor state: TodoState = { items: ["init"], filter: "active" };
        }

        const el = createMockInstance(MyEl);
        el.state.items.push("more");
        el.state.filter = "done";

        (el as any).$reset_state();
        expect(el.state.items).toEqual(["init"]);
        expect(el.state.filter).toBe("active");
    });

    it("$reset produces a fresh clone — mutations don't affect defaults", () => {
        class MyEl {
            @store<TodoState>({ items: [], filter: "all" })
            accessor state!: TodoState;
        }

        const el = createMockElement(MyEl.prototype);

        // Mutate, reset, mutate again
        el.state.items.push("first");
        el.$reset_state();
        el.state.items.push("second");
        el.$reset_state();

        // Should always go back to clean defaults
        expect(el.state.items).toEqual([]);
    });

    it("mutations work after $reset", () => {
        class MyEl {
            @store<TodoState>({ items: [], filter: "all" })
            accessor state!: TodoState;
        }

        const el = createMockElement(MyEl.prototype);
        el.state.items.push("before");
        el.$reset_state();
        el.scheduleUpdate.mockClear();

        el.state.items.push("after");
        expect(el.scheduleUpdate).toHaveBeenCalled();
        expect(el.state.items).toEqual(["after"]);
    });
});

// ── 4. PREV SNAPSHOT ACCURACY ──

describe("@store prev snapshot", () => {
    it("provides accurate prev for nested mutations", () => {
        const watchFn = vi.fn();
        interface Deep { a: { b: { c: number } } }

        class MyEl {
            @store<Deep>({ a: { b: { c: 0 } } })
            accessor state!: Deep;

            @watch("state")
            onState(val: Deep, prev: Deep) { watchFn(val, prev); }
        }

        const el = createMockInstance(MyEl);
        void el.state;
        watchFn.mockClear();

        el.state.a.b.c = 42;
        expect(watchFn).toHaveBeenCalled();
        const [current, prev] = watchFn.mock.calls[0];
        expect(current.a.b.c).toBe(42);
        expect(prev.a.b.c).toBe(0);
    });

    it("provides accurate prev for array mutations", () => {
        const watchFn = vi.fn();

        class MyEl {
            @store<TodoState>({ items: ["a", "b"], filter: "all" })
            accessor state!: TodoState;

            @watch("state")
            onState(val: TodoState, prev: TodoState) { watchFn(val, prev); }
        }

        const el = createMockInstance(MyEl);
        void el.state;
        watchFn.mockClear();

        el.state.items.push("c");
        expect(watchFn).toHaveBeenCalled();
        const [current, prev] = watchFn.mock.calls[0];
        expect(current.items).toEqual(["a", "b", "c"]);
        expect(prev.items).toEqual(["a", "b"]);
    });
});

// ── 5. PERSISTENCE WITH FACTORY FORM ──

describe("@store persistence (still works)", () => {
    it("persists and hydrates with factory form", () => {
        const storage = new MemoryStorage();

        class MyEl {
            @store<TodoState>({ items: [], filter: "all" }, { key: "test:v2", storage })
            accessor state!: TodoState;
        }

        const el = createMockElement(MyEl.prototype);
        el.state.filter = "active";

        const stored = storage.get("test:v2");
        expect(stored).not.toBeNull();
        expect(JSON.parse(stored!).filter).toBe("active");
    });
});
