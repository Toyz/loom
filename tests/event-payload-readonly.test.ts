/**
 * A payload is shared, so it is readonly.
 *
 * bus.emit() hands the same event object to every handler in registration
 * order. Nothing stopped a handler writing to `e.data`, and one that did --
 * normalising a field, stashing a result on it -- changed what every later
 * handler saw. Which handler won depended on registration order, which no
 * line of either handler mentions.
 *
 * The guarantee is `Readonly<T>` on the field rather than Object.freeze:
 * freezing cost 15% of emit and left the payload slower to read for the rest
 * of its life, and every handler is a reader. The type catches the mistake
 * where catching it is free.
 *
 * The @ts-expect-error lines below are the assertion. They are checked by
 * `npm run test:types`, not by the runtime run -- a line that stops being an
 * error fails that typecheck.
 */
import { describe, it, expect } from "vitest";
import { LoomEvent, EventBus } from "../src/index";

class ThemeChanged extends LoomEvent<{ theme: string; nested: { n: number } }> {}

describe("LoomEvent payload is readonly", () => {
  it("rejects a write to a payload field at compile time", () => {
    const e = new ThemeChanged({ theme: "dark", nested: { n: 1 } });
    // @ts-expect-error data is Readonly -- handlers must not mutate a shared payload
    e.data.theme = "light";
    expect(e.data.theme).toBe("light"); // it is a type guarantee, not a lock
  });

  it("rejects replacing the payload wholesale", () => {
    const e = new ThemeChanged({ theme: "dark", nested: { n: 1 } });
    // @ts-expect-error data is readonly
    e.data = { theme: "light", nested: { n: 2 } };
    expect(e).toBeInstanceOf(ThemeChanged);
  });

  it("clone is the way to send a changed payload", () => {
    const first = new ThemeChanged({ theme: "dark", nested: { n: 1 } });
    const second = first.clone({ data: { theme: "light", nested: { n: 2 } } });

    expect(first.data.theme).toBe("dark");   // original untouched
    expect(second.data.theme).toBe("light");
    expect(second).toBeInstanceOf(ThemeChanged);
  });

  it("is shallow, and says so", () => {
    const e = new ThemeChanged({ theme: "dark", nested: { n: 1 } });
    // Readonly<T> is shallow, so a nested object is still writable by type.
    // Documented rather than defended: deep-readonly on every payload is a
    // type-inference cost on a hot generic, and the object was the caller's.
    e.data.nested.n = 2;
    expect(e.data.nested.n).toBe(2);
  });

  it("accepts a payload event where a plain one goes", () => {
    // The constraint on every emit/on signature is LoomEvent<any>. A bare
    // Readonly<T> on `data` made the classic no-payload form stop satisfying
    // it, which would have broken every existing event in the library.
    const bus = new EventBus();
    let got: string | undefined;
    bus.on(ThemeChanged, (e) => { got = e.data.theme; });
    bus.emit(new ThemeChanged({ theme: "dark", nested: { n: 1 } }));
    expect(got).toBe("dark");

    class Plain extends LoomEvent {
      constructor(readonly n: number) { super(); }
    }
    let n = 0;
    bus.on(Plain, (e) => { n = e.n; });
    bus.emit(new Plain(3));
    expect(n).toBe(3);
  });

  it("still delivers one object to every handler", () => {
    const bus = new EventBus();
    const seen: unknown[] = [];
    bus.on(ThemeChanged, (e) => seen.push(e.data));
    bus.on(ThemeChanged, (e) => seen.push(e.data));

    const payload = { theme: "dark", nested: { n: 1 } };
    bus.emit(new ThemeChanged(payload));

    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(payload);   // the sharing the readonly exists for
    expect(seen[1]).toBe(seen[0]);
  });
});
