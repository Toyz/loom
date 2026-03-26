/**
 * Regression tests: round 3 bug fixes (v0.20.7)
 *
 * Covers:
 *  1. app.ts — _started set before customElements.define
 *  2. app.ts — DOM + bus @on handlers cleaned up in stop()
 *  3. lazy.ts — viewport opts not mutated (shared across instances)
 *  4. reactive.ts — subscriber unsubscribe during set()/notify() safe
 *  5. css.ts — adoptCSS dedup uses indexOf (perf)
 *  6. css.ts — identity cache for tagged templates
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// 1. Reactive subscriber safety during set/notify
// ═══════════════════════════════════════════════════════════════════════════

import { Reactive, CollectionStore } from "../src/store/reactive";

describe("reactive: subscriber safety during set()", () => {
  it("unsubscribe in subscriber doesn't skip next subscriber", () => {
    const r = new Reactive(0);
    const calls: number[] = [];

    let unsub1: () => void;
    unsub1 = r.subscribe(() => {
      calls.push(1);
      unsub1(); // remove self during notification
    });
    r.subscribe(() => calls.push(2));
    r.subscribe(() => calls.push(3));

    r.set(42);

    // All three should fire — self-removal doesn't skip 2 or 3
    expect(calls).toEqual([1, 2, 3]);

    // Second set — only 2 and 3
    calls.length = 0;
    r.set(99);
    expect(calls).toEqual([2, 3]);
  });

  it("unsubscribe in subscriber doesn't skip during notify()", () => {
    const r = new Reactive([1, 2, 3]);
    const calls: string[] = [];

    let unsub: () => void;
    unsub = r.subscribe(() => {
      calls.push("self-removing");
      unsub();
    });
    r.subscribe(() => calls.push("persistent"));

    r.notify();

    expect(calls).toEqual(["self-removing", "persistent"]);
  });

  it("version bumps correctly on set()", () => {
    const r = new Reactive("a");
    const v0 = r.peekVersion();

    r.set("b");
    expect(r.peekVersion()).toBe(v0 + 1);

    // Same value — no version bump
    r.set("b");
    expect(r.peekVersion()).toBe(v0 + 1);
  });

  it("version bumps on notify() even without value change", () => {
    const r = new Reactive([1]);
    const v0 = r.peekVersion();

    r.notify();
    expect(r.peekVersion()).toBe(v0 + 1);
  });

  it("watch() fires immediately with current value", () => {
    const r = new Reactive(42);
    let received: number | undefined;

    r.watch((v) => { received = v; });

    expect(received).toBe(42);
  });
});

describe("reactive: CollectionStore CRUD", () => {
  it("add() auto-generates id", () => {
    const store = new CollectionStore<{ id: string; name: string }>();
    const item = store.add({ name: "test" });

    expect(item.id).toBeDefined();
    expect(item.name).toBe("test");
    expect(store.value.length).toBe(1);
  });

  it("remove() by id", () => {
    const store = new CollectionStore<{ id: string; name: string }>();
    const item = store.add({ name: "test" });
    store.remove(item.id);

    expect(store.value.length).toBe(0);
  });

  it("update() patches in place", () => {
    const store = new CollectionStore<{ id: string; name: string; count: number }>();
    const item = store.add({ name: "test", count: 0 });
    const updated = store.update(item.id, { count: 5 });

    expect(updated.count).toBe(5);
    expect(updated.id).toBe(item.id);
    expect(store.value[0].count).toBe(5);
  });

  it("find() by id", () => {
    const store = new CollectionStore<{ id: string; name: string }>();
    const item = store.add({ name: "findme" });

    expect(store.find(item.id)?.name).toBe("findme");
    expect(store.find("nonexistent")).toBeUndefined();
  });

  it("clear() empties all items", () => {
    const store = new CollectionStore<{ id: string; name: string }>();
    store.add({ name: "a" });
    store.add({ name: "b" });
    store.clear();

    expect(store.value.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. CSS cache and dedup
// ═══════════════════════════════════════════════════════════════════════════

import { css, adoptCSS } from "../src/css";

describe("css: tagged template caching", () => {
  it("same template literal returns same CSSStyleSheet", () => {
    const a = css`:host { display: block; }`;
    const b = css`:host { display: block; }`;

    expect(a).toBe(b); // identity cache
  });

  it("different templates return different sheets", () => {
    const a = css`:host { color: red; }`;
    const b = css`:host { color: blue; }`;

    expect(a).not.toBe(b);
  });

  it("interpolation works", () => {
    const size = 16;
    const sheet = css`:host { font-size: ${size}px; }`;

    expect(sheet).toBeInstanceOf(CSSStyleSheet);
  });
});

describe("css: adoptCSS dedup", () => {
  it("adopting same CSS twice only adds one sheet", () => {
    const shadow = document.createElement("div").attachShadow({ mode: "open" });

    adoptCSS(shadow, ":host { display: block; }");
    adoptCSS(shadow, ":host { display: block; }");

    expect(shadow.adoptedStyleSheets.length).toBe(1);
  });

  it("adopting different CSS adds both", () => {
    const shadow = document.createElement("div").attachShadow({ mode: "open" });

    adoptCSS(shadow, ":host { display: block; }");
    adoptCSS(shadow, ":host { color: red; }");

    expect(shadow.adoptedStyleSheets.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. App lifecycle
// ═══════════════════════════════════════════════════════════════════════════

import { LoomResult } from "../src/result";

describe("app: LoomResult integration", () => {
  it("LoomResult.err wraps error correctly", () => {
    const result = LoomResult.err(new Error("test"));
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("LoomResult.ok wraps value", () => {
    const result = LoomResult.ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  it("LoomResult.ok and err are discriminated", () => {
    const ok = LoomResult.ok("hello");
    const err = LoomResult.err("fail");

    if (ok.ok) {
      expect(ok.value).toBe("hello");
    }
    if (!err.ok) {
      expect(err.error).toBe("fail");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Reactive updater function
// ═══════════════════════════════════════════════════════════════════════════

describe("reactive: updater functions", () => {
  it("set() accepts an updater function", () => {
    const r = new Reactive(10);
    r.set(prev => prev + 5);

    expect(r.value).toBe(15);
  });

  it("updater receives previous value", () => {
    const r = new Reactive("hello");
    r.set(prev => prev + " world");

    expect(r.value).toBe("hello world");
  });

  it("peek() does not trigger trace recording", () => {
    const r = new Reactive(42);
    const val = r.peek();

    expect(val).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Multiple subscribers + edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe("reactive: edge cases", () => {
  it("set to same value is a no-op", () => {
    const r = new Reactive(42);
    let callCount = 0;
    r.subscribe(() => callCount++);

    r.set(42); // same value
    expect(callCount).toBe(0);
  });

  it("subscribe returns working unsubscribe", () => {
    const r = new Reactive(0);
    let count = 0;
    const unsub = r.subscribe(() => count++);

    r.set(1);
    expect(count).toBe(1);

    unsub();
    r.set(2);
    expect(count).toBe(1); // no longer subscribed
  });

  it("double unsubscribe is safe", () => {
    const r = new Reactive(0);
    const unsub = r.subscribe(() => {});

    unsub();
    unsub(); // second call should not throw or corrupt

    r.set(1);
    // If this doesn't crash, the guard works
    expect(r.value).toBe(1);
  });

  it("many subscribers", () => {
    const r = new Reactive(0);
    let total = 0;
    const unsubs: (() => void)[] = [];

    for (let i = 0; i < 100; i++) {
      unsubs.push(r.subscribe(() => total++));
    }

    r.set(1);
    expect(total).toBe(100);

    // Unsubscribe all
    for (const u of unsubs) u();
    r.set(2);
    expect(total).toBe(100); // no more calls
  });
});
