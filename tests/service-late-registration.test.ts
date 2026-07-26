/**
 * A @service registered after app.start() must still come up.
 *
 * start() is one-shot, and registration happens at class-definition time. So
 * a service declared in a lazily-loaded route module — which is the normal
 * way to declare one in a code-split app — was queued and then never looked
 * at again: app.get() threw "no provider", and its @on handlers never bound.
 * Nothing else was ever going to come back for it.
 */
import { describe, it, expect, vi } from "vitest";
import { app, LoomEvent, on } from "../src/index";
import { service } from "../src/di/index";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

class Ping extends LoomEvent {
  constructor(public readonly n: number) { super(); }
}

describe("late @service registration", () => {
  it("constructs a service registered after start()", async () => {
    await app.start();

    @service()
    class Late {
      readonly id = "late";
    }

    // No second start() — this is the lazily-loaded-module case.
    expect(app.get(Late).id).toBe("late");
  });

  it("resolves synchronously, so a decorator can register and read at once", async () => {
    await app.start();

    @service()
    class Immediate {
      value = 42;
    }

    // Not awaited: wiring is synchronous precisely so this works.
    expect(app.get(Immediate).value).toBe(42);
  });

  it("binds @on handlers on a late service", async () => {
    await app.start();
    const seen: number[] = [];

    @service()
    class LateListener {
      @on(Ping)
      onPing(e: Ping) { seen.push(e.n); }
    }
    app.get(LateListener); // force construction

    app.emit(new Ping(1));
    await tick();
    expect(seen).toEqual([1]);
  });

  it("registers a named service under its string key too", async () => {
    await app.start();

    @service("late-named")
    class LateNamed {
      readonly tag = "n";
    }

    expect(app.get(LateNamed).tag).toBe("n");
    expect(app.get("late-named").tag).toBe("n");
  });

  it("calls LoomLifecycle start() on a late service", async () => {
    await app.start();
    const started = vi.fn();

    @service()
    class LateLifecycle {
      async start() { started(); }
    }
    app.get(LateLifecycle);

    await tick(20);
    expect(started).toHaveBeenCalled();
  });

  it("does not double-register a class queued twice", async () => {
    await app.start();

    @service()
    class Once {
      n = Math.random();
    }
    const a = app.get(Once);
    app.registerService(Once);
    expect(app.get(Once)).toBe(a);
  });
});
