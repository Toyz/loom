/**
 * Tests: Reactive change detection, reentrant notify, and persistence lifecycle.
 *
 *  - `!==` treated NaN as always-changed, so a NaN-valued Reactive notified
 *    and bumped its version on every write — an unbounded re-render loop.
 *  - `_notifySubscribers` hoisted `this._value` out of the dispatch loop and
 *    reused one per-instance scratch buffer, so a subscriber that wrote back
 *    into the same Reactive delivered stale values out of order.
 *  - `clear()` removed the storage key and then called `set()`, whose debounced
 *    microtask re-created it.
 *  - `swapStorage()` never set the `_persists` flag, so a Reactive built
 *    without persistence wrote once and then silently stopped.
 */

import { describe, it, expect, vi } from "vitest";
import { Reactive } from "../src/store/reactive";
import type { StorageAdapter } from "../src/store/storage";

/** In-memory StorageAdapter with call tracking. */
function memStorage() {
  const data = new Map<string, string>();
  const adapter: StorageAdapter = {
    get: (k) => data.get(k) ?? null,
    set: (k, v) => { data.set(k, v); },
    remove: (k) => { data.delete(k); },
  };
  return { adapter, data };
}

const tick = () => new Promise<void>((r) => queueMicrotask(r));

// ── Change detection ────────────────────────────────────────────────────────

describe("Reactive change detection", () => {
  it("treats NaN → NaN as no change", () => {
    const r = new Reactive<number>(NaN);
    const sub = vi.fn();
    r.subscribe(sub);

    const v0 = r.peekVersion();
    r.set(NaN);
    r.set(NaN);

    expect(sub).not.toHaveBeenCalled();
    expect(r.peekVersion()).toBe(v0);
  });

  it("still reports a real change into and out of NaN", () => {
    const r = new Reactive<number>(1);
    const sub = vi.fn();
    r.subscribe(sub);

    r.set(NaN);
    expect(sub).toHaveBeenCalledTimes(1);
    r.set(2);
    expect(sub).toHaveBeenCalledTimes(2);
  });

  it("treats an identical primitive as no change", () => {
    const r = new Reactive(5);
    const sub = vi.fn();
    r.subscribe(sub);
    r.set(5);
    expect(sub).not.toHaveBeenCalled();
  });
});

// ── Reentrancy ──────────────────────────────────────────────────────────────

describe("Reactive reentrant notify", () => {
  it("delivers the final value to every subscriber, in order", () => {
    const r = new Reactive(0);
    const seen: Array<[string, number]> = [];

    // Subscriber 0 clamps negatives back to 0 — a re-entrant set().
    r.subscribe((v) => { if (v < 0) r.set(0); });
    r.subscribe((v) => seen.push(["b", v]));
    r.subscribe((v) => seen.push(["c", v]));

    r.set(-5);

    // Whatever the interleaving, no subscriber may be handed -5 after the
    // clamp already reset the value, and the last value each observed must
    // match the settled state.
    expect(r.peek()).toBe(0);
    const lastB = seen.filter(([n]) => n === "b").pop()![1];
    const lastC = seen.filter(([n]) => n === "c").pop()![1];
    expect(lastB).toBe(0);
    expect(lastC).toBe(0);
  });

  it("does not corrupt the outer dispatch when a subscriber re-enters", () => {
    const r = new Reactive(0);
    const calls: number[] = [];

    r.subscribe((v) => { if (v === 1) r.set(2); });
    r.subscribe((v) => calls.push(v));

    r.set(1);

    // The second subscriber must see the nested value, and must not be
    // invoked with a value the Reactive no longer holds as its latest.
    expect(r.peek()).toBe(2);
    expect(calls).toContain(2);
    expect(calls[calls.length - 1]).toBe(2);
  });

  it("restores dispatch depth after a throwing subscriber", () => {
    const r = new Reactive(0);
    r.subscribe(() => { throw new Error("boom"); });

    expect(() => r.set(1)).toThrow("boom");

    // Depth must have unwound, so a later notify still uses the fast path
    // and still reaches its subscribers.
    const after = vi.fn();
    const r2 = new Reactive(0);
    r2.subscribe(after);
    r2.set(9);
    expect(after).toHaveBeenCalledWith(9, 0);
  });

  it("is safe when a subscriber unsubscribes mid-dispatch", () => {
    const r = new Reactive(0);
    const b = vi.fn();
    const offA = r.subscribe(() => offA());
    r.subscribe(b);

    r.set(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

// ── Persistence ─────────────────────────────────────────────────────────────

describe("Reactive persistence lifecycle", () => {
  it("clear() leaves the key removed even with a pending write", async () => {
    const { adapter, data } = memStorage();
    const r = new Reactive(1, { key: "k", storage: adapter });

    r.set(5);            // schedules a debounced flush
    r.clear(0);          // must reset AND leave storage clean
    await tick();
    await tick();

    expect(r.peek()).toBe(0);
    expect(data.has("k")).toBe(false);
  });

  it("clear() removes the key when resetTo equals the current value", async () => {
    const { adapter, data } = memStorage();
    const r = new Reactive(7, { key: "k", storage: adapter });
    r.set(7);
    await tick();

    r.clear(7);
    await tick();
    await tick();

    expect(data.has("k")).toBe(false);
  });

  it("a write after clear() persists again", async () => {
    const { adapter, data } = memStorage();
    const r = new Reactive(1, { key: "k", storage: adapter });

    r.clear(0);
    await tick();
    expect(data.has("k")).toBe(false);

    r.set(3);
    await tick();
    expect(data.get("k")).toBe("3");
  });

  it("swapStorage() enables persistence on a non-persisted Reactive", async () => {
    const { adapter, data } = memStorage();
    const r = new Reactive(1); // constructed WITHOUT persistence

    r.swapStorage({ key: "later", storage: adapter });
    expect(data.get("later")).toBe("1");

    r.set(2);
    await tick();
    expect(data.get("later")).toBe("2");

    r.set(3);
    await tick();
    expect(data.get("later")).toBe("3");
  });

  it("swapStorage() redirects subsequent writes to the new adapter", async () => {
    const first = memStorage();
    const second = memStorage();
    const r = new Reactive(1, { key: "a", storage: first.adapter });

    r.swapStorage({ key: "b", storage: second.adapter });
    r.set(42);
    await tick();

    expect(second.data.get("b")).toBe("42");
    expect(first.data.get("a")).not.toBe("42");
  });

  it("coalesces several writes in a tick into one storage write", async () => {
    const { adapter } = memStorage();
    const spy = vi.spyOn(adapter, "set");
    const r = new Reactive(0, { key: "k", storage: adapter });

    r.set(1); r.set(2); r.set(3);
    await tick();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("k", "3");
  });
});
