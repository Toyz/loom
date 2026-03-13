/**
 * Tests: LoomLifecycle<Start | Stop> — auto-start/stop for DI services
 *
 * Covers:
 *  - hasStart / hasStop type guards (all falsy inputs)
 *  - app.start() fires start() in registration order
 *  - async start() is sequentially awaited
 *  - app.start() is idempotent (second call is a no-op)
 *  - app.stop() fires stop() in REVERSE registration order
 *  - app.stop() before app.start() does not throw
 *  - start() throwing propagates out of app.start()
 *  - Services with only start(), only stop(), or both
 *  - Mixed lifecycle/plain services in same container
 *  - app.use() instances are excluded from lifecycle management
 *  - LoomRouter lifecycle: idempotent start(), stop() removes listener, restart after stop
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasStart, hasStop } from "../src/lifecycle";
import { app } from "../src/app";
import { LoomRouter } from "../src/router/router";

beforeEach(() => {
  (app as any).providers = new Map();
  (app as any).services = [];
  (app as any).factories = [];
  (app as any).components = [];
  (app as any)._started = false;
});

// ─────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────

describe("hasStart", () => {
  it("true for object with function start()", () => {
    expect(hasStart({ start: () => {} })).toBe(true);
  });
  it("true for object whose start is an async function", () => {
    expect(hasStart({ start: async () => {} })).toBe(true);
  });
  it("false when start is a string", () => {
    expect(hasStart({ start: "yes" })).toBe(false);
  });
  it("false when start is a number", () => {
    expect(hasStart({ start: 1 })).toBe(false);
  });
  it("false when start is undefined", () => {
    expect(hasStart({ start: undefined })).toBe(false);
  });
  it("false for empty object", () => {
    expect(hasStart({})).toBe(false);
  });
  it("false for null", () => {
    expect(hasStart(null)).toBe(false);
  });
  it("false for primitive", () => {
    expect(hasStart(42)).toBe(false);
    expect(hasStart("string")).toBe(false);
  });
});

describe("hasStop", () => {
  it("true for object with function stop()", () => {
    expect(hasStop({ stop: () => {} })).toBe(true);
  });
  it("false when stop is a number", () => {
    expect(hasStop({ stop: 0 })).toBe(false);
  });
  it("false for empty object", () => {
    expect(hasStop({})).toBe(false);
  });
  it("false for null", () => {
    expect(hasStop(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// app.start() — lifecycle call ordering
// ─────────────────────────────────────────────

describe("app.start() — lifecycle ordering", () => {
  it("calls start() on a service that implements it", async () => {
    const startFn = vi.fn();
    class Svc { start() { startFn(); } }
    app.registerService(Svc);
    await app.start();
    expect(startFn).toHaveBeenCalledOnce();
  });

  it("does not throw for a service without start()", async () => {
    class PlainSvc {}
    app.registerService(PlainSvc);
    await expect(app.start()).resolves.toBeUndefined();
  });

  it("awaits async start() sequentially before the next service starts", async () => {
    const order: string[] = [];
    class A {
      async start() {
        await new Promise<void>(r => setTimeout(r, 10));
        order.push("A");
      }
    }
    class B {
      start() { order.push("B"); }
    }
    app.registerService(A);
    app.registerService(B);
    await app.start();
    // B must start AFTER A fully resolves
    expect(order).toEqual(["A", "B"]);
  });

  it("calls start() in registration order", async () => {
    const order: string[] = [];
    class First  { start() { order.push("first");  } }
    class Second { start() { order.push("second"); } }
    class Third  { start() { order.push("third");  } }
    app.registerService(First);
    app.registerService(Second);
    app.registerService(Third);
    await app.start();
    expect(order).toEqual(["first", "second", "third"]);
  });

  it("skips services that only have stop()", async () => {
    const startFn = vi.fn();
    class StopOnly { stop() { startFn(); } }
    app.registerService(StopOnly);
    await app.start();
    // stop() must NOT be called during start
    expect(startFn).not.toHaveBeenCalled();
  });

  it("handles a mix of plain and lifecycle services", async () => {
    const order: string[] = [];
    class Plain {}
    class WithStart { start() { order.push("ws"); } }
    class AnotherPlain {}
    app.registerService(Plain);
    app.registerService(WithStart);
    app.registerService(AnotherPlain);
    await app.start();
    expect(order).toEqual(["ws"]);
  });
});

// ─────────────────────────────────────────────
// app.start() — idempotency
// ─────────────────────────────────────────────

describe("app.start() — idempotency", () => {
  it("calling start() twice only fires service.start() once", async () => {
    const startFn = vi.fn();
    class Svc { start() { startFn(); } }
    app.registerService(Svc);
    await app.start();
    await app.start(); // second call must be a no-op
    expect(startFn).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────
// app.start() — error propagation
// ─────────────────────────────────────────────

describe("app.start() — error propagation", () => {
  it("propagates a synchronous throw from start()", async () => {
    class BadSvc { start() { throw new Error("boom"); } }
    app.registerService(BadSvc);
    await expect(app.start()).rejects.toThrow("boom");
  });

  it("propagates a rejected async start()", async () => {
    class AsyncBad {
      async start() { throw new Error("async boom"); }
    }
    app.registerService(AsyncBad);
    await expect(app.start()).rejects.toThrow("async boom");
  });

  it("does not call subsequent services' start() after a failure", async () => {
    const afterFn = vi.fn();
    class Bad { start() { throw new Error("fail"); } }
    class After { start() { afterFn(); } }
    app.registerService(Bad);
    app.registerService(After);
    await expect(app.start()).rejects.toThrow("fail");
    expect(afterFn).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// app.stop() — lifecycle call ordering
// ─────────────────────────────────────────────

describe("app.stop() — lifecycle ordering", () => {
  it("calls stop() on a service that implements it", async () => {
    const stopFn = vi.fn();
    class Svc { stop() { stopFn(); } }
    app.registerService(Svc);
    await app.start();
    app.stop();
    expect(stopFn).toHaveBeenCalledOnce();
  });

  it("does not throw for a service without stop()", async () => {
    class PlainSvc {}
    app.registerService(PlainSvc);
    await app.start();
    expect(() => app.stop()).not.toThrow();
  });

  it("calls stop() in REVERSE registration order", async () => {
    const order: string[] = [];
    class First  { stop() { order.push("first");  } }
    class Second { stop() { order.push("second"); } }
    class Third  { stop() { order.push("third");  } }
    app.registerService(First);
    app.registerService(Second);
    app.registerService(Third);
    await app.start();
    app.stop();
    expect(order).toEqual(["third", "second", "first"]);
  });

  it("skips services that only have start() during stop()", async () => {
    const startFn = vi.fn();
    class StartOnly { start() { startFn(); } }
    app.registerService(StartOnly);
    await app.start();
    // reset call count — stop() must not call start() again
    startFn.mockClear();
    app.stop();
    expect(startFn).not.toHaveBeenCalled();
  });

  it("handles mixed lifecycle/plain services on stop()", async () => {
    const order: string[] = [];
    class Plain {}
    class WithStop { stop() { order.push("ws"); } }
    class AnotherPlain {}
    app.registerService(Plain);
    app.registerService(WithStop);
    app.registerService(AnotherPlain);
    await app.start();
    app.stop();
    expect(order).toEqual(["ws"]);
  });
});

// ─────────────────────────────────────────────
// app.stop() — edge cases
// ─────────────────────────────────────────────

describe("app.stop() — edge cases", () => {
  it("does not throw if called before app.start()", () => {
    class Svc { stop() {} }
    app.registerService(Svc);
    // stop() before start() — services[] is populated but providers are empty
    expect(() => app.stop()).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// Full lifecycle (start + stop)
// ─────────────────────────────────────────────

describe("LoomLifecycle — full lifecycle (start + stop)", () => {
  it("fires start then stop in the correct sequence", async () => {
    const events: string[] = [];
    class Svc {
      start() { events.push("start"); }
      stop()  { events.push("stop");  }
    }
    app.registerService(Svc);
    await app.start();
    expect(events).toEqual(["start"]);
    app.stop();
    expect(events).toEqual(["start", "stop"]);
  });

  it("two services: A starts before B, B stops before A", async () => {
    const events: string[] = [];
    class A {
      start() { events.push("A:start"); }
      stop()  { events.push("A:stop");  }
    }
    class B {
      start() { events.push("B:start"); }
      stop()  { events.push("B:stop");  }
    }
    app.registerService(A);
    app.registerService(B);
    await app.start();
    app.stop();
    expect(events).toEqual(["A:start", "B:start", "B:stop", "A:stop"]);
  });
});

// ─────────────────────────────────────────────
// app.use() instances — excluded from lifecycle
// ─────────────────────────────────────────────

describe("LoomLifecycle — app.use() instances are not lifecycle-managed", () => {
  it("does NOT call start() on a manually registered instance", async () => {
    const startFn = vi.fn();
    class ManualSvc { start() { startFn(); } }
    app.use(new ManualSvc());
    await app.start();
    expect(startFn).not.toHaveBeenCalled();
  });

  it("does NOT call stop() on a manually registered instance", async () => {
    const stopFn = vi.fn();
    class ManualSvc { stop() { stopFn(); } }
    app.use(new ManualSvc());
    await app.start();
    app.stop();
    expect(stopFn).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// LoomRouter — lifecycle integration
// ─────────────────────────────────────────────

describe("LoomRouter lifecycle", () => {
  it("start() attaches a URL listener (history mode mock)", () => {
    const router = new LoomRouter({ mode: "hash" });
    expect((router as any)._cleanup).toBeNull();
    router.start();
    expect(typeof (router as any)._cleanup).toBe("function");
    router.stop();
  });

  it("start() is idempotent — calling twice does not double-register", () => {
    const router = new LoomRouter({ mode: "hash" });
    router.start();
    const first = (router as any)._cleanup;
    router.start(); // second call must be ignored
    expect((router as any)._cleanup).toBe(first); // same reference
    router.stop();
  });

  it("stop() clears the cleanup reference", () => {
    const router = new LoomRouter({ mode: "hash" });
    router.start();
    router.stop();
    expect((router as any)._cleanup).toBeNull();
  });

  it("stop() before start() does not throw", () => {
    const router = new LoomRouter({ mode: "hash" });
    expect(() => router.stop()).not.toThrow();
  });

  it("can be restarted after stop()", () => {
    const router = new LoomRouter({ mode: "hash" });
    router.start();
    router.stop();
    router.start(); // should work again
    expect(typeof (router as any)._cleanup).toBe("function");
    router.stop();
  });

  it("stop() calls the cleanup function returned by mode.listen()", () => {
    const cleanupFn = vi.fn();
    const router = new LoomRouter({ mode: "hash" });
    // Patch mode.listen to return our spy
    (router as any).mode.listen = () => cleanupFn;
    router.start();
    router.stop();
    expect(cleanupFn).toHaveBeenCalledOnce();
  });
});

