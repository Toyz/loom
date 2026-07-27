/**
 * Cross-tab @persist.
 *
 * Two tabs of the same app both persisting to one key used to diverge the
 * moment either wrote: each holds its own copy in memory and only reads
 * storage once, at construction. Nothing surfaced the conflict -- the last
 * writer won the stored value while both kept rendering something else.
 *
 * A second Reactive on the same key stands in for the second tab, since that
 * is exactly what it is: another listener, another in-memory copy.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { Reactive } from "../src/store/reactive";
import { MemoryStorage } from "../src/store/storage";

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Fire the event the browser fires in *other* tabs. */
function storageEvent(key: string, newValue: string | null) {
  const e = new Event("storage") as any;
  e.key = key;
  e.newValue = newValue;
  window.dispatchEvent(e);
}

const created: Reactive<any>[] = [];
function make<T>(key: string, initial: T, sync: boolean, storage = new MemoryStorage()) {
  const r = new Reactive<T>(initial, { key, storage, sync });
  created.push(r);
  return r;
}

afterEach(() => {
  created.splice(0).forEach((r) => r.dispose?.());
});

describe("persist sync", () => {
  it("adopts a value written by another tab", async () => {
    const r = make("k1", "a", true);
    expect(r.value).toBe("a");

    storageEvent("k1", JSON.stringify("from-other-tab"));

    expect(r.value).toBe("from-other-tab");
  });

  it("notifies subscribers so the UI re-renders", async () => {
    const r = make("k2", 1, true);
    const seen: number[] = [];
    r.subscribe((v) => seen.push(v));

    storageEvent("k2", JSON.stringify(42));

    expect(seen).toEqual([42]);
    expect(r.peekVersion()).toBeGreaterThan(0);
  });

  it("ignores other keys", () => {
    const r = make("k3", "mine", true);
    storageEvent("somebody-else", JSON.stringify("theirs"));
    expect(r.value).toBe("mine");
  });

  it("ignores a cleared key rather than blanking the value", () => {
    const r = make("k4", "keep", true);
    storageEvent("k4", null);
    // A remove elsewhere is not an instruction to throw away what we have.
    expect(r.value).toBe("keep");
  });

  it("survives unparseable data", () => {
    const r = make("k5", "good", true);
    storageEvent("k5", "{not json");
    expect(r.value).toBe("good");
  });

  it("does not re-persist an adopted value", async () => {
    const storage = new MemoryStorage();
    const spy = vi.spyOn(storage, "set");
    const r = make("k6", "a", true, storage);

    storageEvent("k6", JSON.stringify("remote"));
    await tick();

    // Writing it back would be echoing what we were just told -- and over a
    // channel, would bounce between tabs indefinitely.
    expect(spy).not.toHaveBeenCalled();
    expect(r.value).toBe("remote");
  });

  it("stays isolated when sync is off", () => {
    const r = make("k7", "mine", false);
    storageEvent("k7", JSON.stringify("theirs"));
    expect(r.value).toBe("mine"); // opt-in, so nothing changes by default
  });

  it("dispose stops listening", () => {
    const r = make("k8", "a", true);
    r.dispose();
    storageEvent("k8", JSON.stringify("late"));
    // Otherwise every component instance ever created keeps a window
    // listener for the life of the page.
    expect(r.value).toBe("a");
  });

  it("still persists local writes", async () => {
    const storage = new MemoryStorage();
    const r = make("k9", "a", true, storage);
    r.set("b");
    await tick();
    expect(storage.get("k9")).toBe(JSON.stringify("b"));
  });

  it("two instances on one key converge", async () => {
    // The actual scenario: two tabs, one key.
    const shared = new MemoryStorage();
    const tabA = make("k10", "start", true, shared);
    const tabB = make("k10", "start", true, shared);

    tabA.set("typed in A");
    await tick();
    // The browser fires `storage` in the other tab, not the writer.
    storageEvent("k10", shared.get("k10"));

    expect(tabB.value).toBe("typed in A");
    expect(tabA.value).toBe("typed in A");
  });
});
