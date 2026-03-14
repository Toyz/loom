/**
 * Tests: @persist — single-value persistent auto-accessor
 *
 * Covers:
 *  - Bare @persist (key from accessor name, default localStorage)
 *  - Explicit string key
 *  - Custom StorageAdapter via options
 *  - Hydrates from storage on first access
 *  - Falls back to init value when storage is empty
 *  - Writes to storage on set
 *  - JSON round-trip for non-string values
 *  - Multiple @persist on same class are independent
 *  - Reactive — triggers scheduleUpdate()
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { persist } from "../src/store/decorators";
import { MemoryStorage } from "../src/store/storage";

// ── Helpers ──
// Use `new` so field initializers run (which calls init() → stashes default).
// Attach a mock scheduleUpdate so @persist can wire reactivity.

function make<T>(Ctor: new () => T): T & { scheduleUpdate: ReturnType<typeof vi.fn> } {
  const el = new Ctor() as T & { scheduleUpdate: ReturnType<typeof vi.fn> };
  el.scheduleUpdate = vi.fn();
  return el;
}

// ── Bare @persist ──

describe("@persist — bare (default key + localStorage)", () => {
  it("returns the init value when storage is empty", () => {
    class El { @persist accessor theme = "dark"; }
    const el = make(El);
    expect(el.theme).toBe("dark");
  });

  it("set updates the value", () => {
    class El { @persist accessor theme = "dark"; }
    const el = make(El);
    el.theme = "light";
    expect(el.theme).toBe("light");
  });

  it("triggers scheduleUpdate on set", () => {
    class El { @persist accessor count = 0; }
    const el = make(El);
    void el.count; // init
    el.scheduleUpdate.mockClear();
    el.count = 42;
    expect(el.scheduleUpdate).toHaveBeenCalled();
  });
});

// ── @persist with MemoryStorage (deterministic) ──

describe("@persist — MemoryStorage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("hydrates from storage on first access", () => {
    storage.set("theme", JSON.stringify("ocean"));
    class El {
      @persist({ key: "theme", storage }) accessor theme = "dark";
    }
    const el = make(El);
    expect(el.theme).toBe("ocean");
  });

  it("falls back to init when storage has no value", () => {
    class El {
      @persist({ key: "theme", storage }) accessor theme = "dark";
    }
    const el = make(El);
    expect(el.theme).toBe("dark");
  });

  it("writes to storage on set", async () => {
    class El {
      @persist({ key: "myval", storage }) accessor count = 0;
    }
    const el = make(El);
    el.count = 99;
    // Reactive uses debounced microtask for persistence
    await new Promise<void>(r => queueMicrotask(r));
    expect(storage.get("myval")).toBe(JSON.stringify(99));
  });

  it("JSON round-trip for objects", async () => {
    class El {
      @persist({ key: "cfg", storage }) accessor config = { a: 1 };
    }
    const el = make(El);
    el.config = { a: 2 };
    await new Promise<void>(r => queueMicrotask(r));
    expect(JSON.parse(storage.get("cfg")!)).toEqual({ a: 2 });
  });

  it("JSON round-trip for arrays", async () => {
    class El {
      @persist({ key: "items", storage }) accessor list: string[] = [];
    }
    const el = make(El);
    el.list = ["a", "b"];
    await new Promise<void>(r => queueMicrotask(r));
    expect(JSON.parse(storage.get("items")!)).toEqual(["a", "b"]);
  });

  it("JSON round-trip for booleans", async () => {
    class El {
      @persist({ key: "flag", storage }) accessor enabled = false;
    }
    const el = make(El);
    el.enabled = true;
    await new Promise<void>(r => queueMicrotask(r));
    expect(JSON.parse(storage.get("flag")!)).toBe(true);
  });

  it("hydrates boolean from storage", () => {
    storage.set("flag", JSON.stringify(true));
    class El {
      @persist({ key: "flag", storage }) accessor enabled = false;
    }
    const el = make(El);
    expect(el.enabled).toBe(true);
  });
});

// ── @persist with explicit key via options ──

describe("@persist({ key }) — explicit string key", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("uses the explicit key instead of accessor name", async () => {
    class El {
      @persist({ key: "user-theme", storage }) accessor theme = "dark";
    }
    const el = make(El);
    el.theme = "solarized";
    await new Promise<void>(r => queueMicrotask(r));
    expect(storage.get("user-theme")).toBe(JSON.stringify("solarized"));
    expect(storage.get("theme")).toBeNull();
  });

  it("hydrates from the explicit key", () => {
    storage.set("user-theme", JSON.stringify("monokai"));
    class El {
      @persist({ key: "user-theme", storage }) accessor theme = "dark";
    }
    const el = make(El);
    expect(el.theme).toBe("monokai");
  });
});

// ── Multiple @persist on same class ──

describe("@persist — multiple on same class", () => {
  it("each accessor is independent", () => {
    const storage = new MemoryStorage();
    storage.set("a", JSON.stringify("alpha"));

    class El {
      @persist({ key: "a", storage }) accessor first = "default-a";
      @persist({ key: "b", storage }) accessor second = "default-b";
    }
    const el = make(El);
    expect(el.first).toBe("alpha");       // hydrated
    expect(el.second).toBe("default-b");  // fallback to init
  });

  it("setting one does not affect the other", async () => {
    const storage = new MemoryStorage();
    class El {
      @persist({ key: "x", storage }) accessor x = 1;
      @persist({ key: "y", storage }) accessor y = 2;
    }
    const el = make(El);
    el.x = 10;
    await new Promise<void>(r => queueMicrotask(r));
    expect(JSON.parse(storage.get("x")!)).toBe(10);
    expect(storage.get("y")).toBeNull();
  });
});

// ── Independent instances ──

describe("@persist — independent instances", () => {
  it("each instance has its own Reactive", () => {
    const storage = new MemoryStorage();
    class El {
      @persist({ key: "val", storage }) accessor val = 0;
    }
    const a = make(El);
    const b = make(El);
    a.val = 42;
    expect(a.val).toBe(42);
    expect(b.val).toBe(0);
  });
});

// ── @persist("string") factory form ──

describe("@persist(string) — factory form", () => {
  it("uses the string as the storage key", () => {
    class El {
      @persist("my-key") accessor data = "hello";
    }
    const el = make(El);
    expect(el.data).toBe("hello");
  });
});

// ── @persist({ storage }) — custom adapter, default key ──

describe("@persist({ storage }) — custom adapter, default key", () => {
  it("uses accessor name as key with custom storage", async () => {
    const storage = new MemoryStorage();
    class El {
      @persist({ storage }) accessor color = "red";
    }
    const el = make(El);
    el.color = "blue";
    await new Promise<void>(r => queueMicrotask(r));
    expect(storage.get("color")).toBe(JSON.stringify("blue"));
  });
});
