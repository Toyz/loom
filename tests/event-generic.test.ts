/**
 * LoomEvent<T> — payload-typed events, and dedup derived from the payload.
 *
 * The classic form (own constructor, own fields) is untouched; T defaults to
 * void so `super()` in an existing subclass still typechecks. These cover the
 * new form and, importantly, that opting in to dedup is still a choice.
 */
import { describe, it, expect, vi } from "vitest";
import { LoomEvent } from "../src/event";
import { bus } from "../src/bus";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("LoomEvent<T>", () => {
  it("takes the payload as its constructor argument", () => {
    class ThemeChanged extends LoomEvent<{ theme: string }> {}
    const e = new ThemeChanged({ theme: "dark" });
    expect(e.data.theme).toBe("dark");
    expect(typeof e.timestamp).toBe("number");
  });

  it("leaves the classic form working", () => {
    class Ping extends LoomEvent {
      constructor(public readonly n: number) { super(); }
    }
    const e = new Ping(3);
    expect(e.n).toBe(3);
    expect(e.dedupeKey).toBeUndefined();   // still opt-in
  });

  it("does not dedup unless asked", async () => {
    class Tick extends LoomEvent<{ n: number }> {}
    const seen: number[] = [];
    const off = bus.on(Tick, (e) => seen.push(e.data.n));

    bus.emit(new Tick({ n: 1 }));
    bus.emit(new Tick({ n: 1 }));   // identical payload, same flush
    await tick();

    // Two identical commands are two commands.
    expect(seen).toEqual([1, 1]);
    off();
  });

  it("derives a key from every field with dedupe = true", async () => {
    class Sync extends LoomEvent<{ id: string }> {
      static override dedupe = true;
    }
    const seen: string[] = [];
    const off = bus.on(Sync, (e) => seen.push(e.data.id));

    bus.emit(new Sync({ id: "a" }));
    bus.emit(new Sync({ id: "a" }));   // collapsed
    bus.emit(new Sync({ id: "b" }));
    await tick();

    expect(seen).toEqual(["a", "b"]);
    off();
  });

  it("derives from only the named fields", async () => {
    class Saved extends LoomEvent<{ docId: string; at: number }> {
      static override dedupe = ["docId"] as const;
    }
    const seen: string[] = [];
    const off = bus.on(Saved, (e) => seen.push(e.data.docId));

    // `at` differs, but it is not part of the identity
    bus.emit(new Saved({ docId: "d1", at: 1 }));
    bus.emit(new Saved({ docId: "d1", at: 2 }));
    bus.emit(new Saved({ docId: "d2", at: 3 }));
    await tick();

    expect(seen).toEqual(["d1", "d2"]);
    off();
  });

  it("is not confused by field order", () => {
    class Pair extends LoomEvent<{ a: number; b: number }> {
      static override dedupe = true;
    }
    const one = new Pair({ a: 1, b: 2 });
    const other = new Pair({ b: 2, a: 1 } as any);
    expect(one.dedupeKey).toBe(other.dedupeKey);
  });

  it("namespaces per class, so unrelated events cannot collide", () => {
    class A extends LoomEvent<{ v: string }> { static override dedupe = true; }
    class B extends LoomEvent<{ v: string }> { static override dedupe = true; }
    // Same payload, different classes — the bus keeps one Set for all types,
    // so these must not produce the same key.
    expect(new A({ v: "x" }).dedupeKey).not.toBe(new B({ v: "x" }).dedupeKey);
  });

  it("does not use the class name, which a minifier would rewrite", () => {
    class Named extends LoomEvent<{ v: number }> { static override dedupe = true; }
    const key = new Named({ v: 1 }).dedupeKey!;
    expect(key).not.toContain("Named");
  });

  it("handles a non-object payload", () => {
    class Count extends LoomEvent<number> { static override dedupe = true; }
    expect(new Count(5).dedupeKey).toBe(new Count(5).dedupeKey);
    expect(new Count(5).dedupeKey).not.toBe(new Count(6).dedupeKey);
  });

  it("still lets a subclass write the key by hand", () => {
    class Custom extends LoomEvent<{ a: number }> {
      override get dedupeKey() { return "fixed"; }
    }
    expect(new Custom({ a: 1 }).dedupeKey).toBe("fixed");
  });
});
