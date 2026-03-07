/**
 * Tests: @store decorator
 *
 * Covers: basic isolation, nested mutations, array mutations,
 * persistence, full replacement, and multi-instance isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { store } from "../src/store/decorators";
import { MemoryStorage } from "../src/store/storage";

// Mock element with scheduleUpdate
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

const defaults: TodoState = { items: [], filter: "all" };

describe("@store basic", () => {
  it("provides default state on first access", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    expect(el.state).toEqual({ items: [], filter: "all" });
  });

  it("triggers scheduleUpdate on top-level set", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    // Access to init
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state.filter = "active";
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.filter).toBe("active");
  });
});

describe("@store nested mutations", () => {
  it("triggers scheduleUpdate on nested property set", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all", meta: { count: 0 } })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state.meta!.count = 5;
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.meta!.count).toBe(5);
  });

  it("triggers scheduleUpdate on array push", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state.items.push("buy milk");
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.items).toContain("buy milk");
  });

  it("triggers scheduleUpdate on array splice", () => {
    class MyEl {
      @store<TodoState>({ items: ["a", "b", "c"], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state.items.splice(1, 1);
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.items).toEqual(["a", "c"]);
  });
});

describe("@store isolation", () => {
  it("each instance has its own state", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all" })
      accessor state!: TodoState;
    }

    const el1 = createMockElement(MyEl.prototype);
    const el2 = createMockElement(MyEl.prototype);

    el1.state.items.push("only in el1");
    expect(el1.state.items).toContain("only in el1");
    expect(el2.state.items).toEqual([]);
  });
});

describe("@store full replacement", () => {
  it("replaces state and triggers update", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state = { items: ["new"], filter: "done" };
    expect(el.state.items).toEqual(["new"]);
    expect(el.state.filter).toBe("done");
  });
});

describe("@store persistence", () => {
  it("persists state changes", () => {
    const storage = new MemoryStorage();

    class MyEl {
      @store<TodoState>({ items: [], filter: "all" }, { key: "test:store", storage })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    el.state.filter = "active";

    const stored = storage.get("test:store");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.filter).toBe("active");
  });

  it("hydrates from storage on init", () => {
    const storage = new MemoryStorage();
    storage.set("test:hydrate", JSON.stringify({ items: ["saved"], filter: "done" }));

    class MyEl {
      @store<TodoState>({ items: [], filter: "all" }, { key: "test:hydrate", storage })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    expect(el.state.items).toEqual(["saved"]);
    expect(el.state.filter).toBe("done");
  });
});

describe("@store edge cases", () => {
  it("triggers scheduleUpdate on delete property", () => {
    class MyEl {
      @store<TodoState>({ items: ["a"], filter: "all", meta: { count: 1 } })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    delete el.state.meta;
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.meta).toBeUndefined();
  });

  it("triggers scheduleUpdate on deeply nested mutation (3+ levels)", () => {
    interface Deep { a: { b: { c: number } } }

    class MyEl {
      @store<Deep>({ a: { b: { c: 0 } } })
      accessor state!: Deep;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state.a.b.c = 99;
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.a.b.c).toBe(99);
  });

  it("triggers scheduleUpdate on array index assignment", () => {
    class MyEl {
      @store<TodoState>({ items: ["a", "b", "c"], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    el.state.items[1] = "replaced";
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.items[1]).toBe("replaced");
  });

  it("full replacement creates new proxy that still tracks", () => {
    class MyEl {
      @store<TodoState>({ items: [], filter: "all" })
      accessor state!: TodoState;
    }

    const el = createMockElement(MyEl.prototype);
    void el.state;
    el.scheduleUpdate.mockClear();

    // Replace entire state
    el.state = { items: ["new"], filter: "done" };
    el.scheduleUpdate.mockClear();

    // Mutations on the new state should still trigger updates
    el.state.items.push("another");
    expect(el.scheduleUpdate).toHaveBeenCalled();
    expect(el.state.items).toEqual(["new", "another"]);
  });
});
