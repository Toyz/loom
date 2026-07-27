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
import { service, factory, inject } from "../src/di/index";

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

/**
 * Same gap, one level down: a @factory inside a lazily-loaded @service.
 *
 * start() ran the queued factories exactly once and never looked again, so a
 * factory declared after it produced no provider at all — the class it was
 * meant to construct stayed unresolvable for the life of the app.
 */
describe("late @factory registration", () => {
  it("runs a @factory declared after start()", async () => {
    await app.start();

    class LateWidget {
      readonly made = "by-factory";
    }

    @service()
    class LateBoot {
      @factory(LateWidget)
      makeWidget() { return new LateWidget(); }
    }
    app.get(LateBoot);

    await tick();
    expect(app.get(LateWidget).made).toBe("by-factory");
  });

  it("invokes it bound to its owning service, so @inject works", async () => {
    await app.start();

    @service()
    class Dep {
      readonly n = 7;
    }

    class Built {
      constructor(readonly n: number) {}
    }

    @service()
    class BoundBoot {
      @inject(Dep) accessor dep!: Dep;

      @factory(Built)
      make() { return new Built(this.dep.n); }
    }
    app.get(BoundBoot);

    await tick();
    expect(app.get(Built).n).toBe(7);
  });

  it("runs each factory once, even as later ones register", async () => {
    await app.start();
    const calls = vi.fn();

    class First {}
    @service()
    class FirstBoot {
      @factory(First)
      make() { calls(); return new First(); }
    }
    app.get(FirstBoot);
    await tick();

    // Registering a second factory drains the queue again. The first must not
    // re-run and replace the provider that consumers already hold.
    const firstInstance = app.get(First);
    class Second {}
    @service()
    class SecondBoot {
      @factory(Second)
      make() { return new Second(); }
    }
    app.get(SecondBoot);
    await tick();

    expect(calls).toHaveBeenCalledTimes(1);
    expect(app.get(First)).toBe(firstInstance);
    expect(app.get(Second)).toBeInstanceOf(Second);
  });
});
