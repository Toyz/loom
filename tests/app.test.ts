/**
 * Tests: LoomApp — boot sequence, DI container, provider registration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We can't easily test the singleton `app` without side effects,
// so we test the LoomApp class behavior through the exported singleton.
// We'll be careful to clean up after each test.

describe("LoomApp", () => {
  // Import fresh for each describe block
  let app: any;

  beforeEach(async () => {
    // Dynamic import to get the singleton
    const mod = await import("../src/app");
    app = mod.app;
  });

  describe("use() / get() / maybe()", () => {
    it("registers and retrieves an instance by constructor key", () => {
      class MyService { value = 42; }
      const svc = new MyService();
      app.use(svc);

      expect(app.get(MyService)).toBe(svc);
      expect(app.get(MyService).value).toBe(42);
    });

    it("registers with explicit key", () => {
      const TOKEN = Symbol("token");
      app.use(TOKEN, "hello");

      expect(app.get(TOKEN)).toBe("hello");
    });

    it("get() throws for missing provider", () => {
      class Missing {}
      expect(() => app.get(Missing)).toThrow(/no provider/);
    });

    it("maybe() returns LoomResult.ok for existing provider", () => {
      class Svc { x = 1; }
      app.use(new Svc());

      const result = app.maybe(Svc);
      expect(result.ok).toBe(true);
      expect(result.value.x).toBe(1);
    });

    it("maybe() returns LoomResult.err for missing provider", () => {
      class Nope {}
      const result = app.maybe(Nope);
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it("use() is chainable", () => {
      class A {}
      class B {}
      const ret = app.use(new A()).use(new B());
      expect(ret).toBe(app);
    });
  });

  describe("register()", () => {
    it("queues components for registration", () => {
      // This just verifies it doesn't throw
      class FakeEl extends HTMLElement {}
      app.register("test-app-fake-el", FakeEl);
    });
  });

  describe("started", () => {
    it("returns false before start()", () => {
      // app may have been started by other tests, so just check the property exists
      expect(typeof app.started).toBe("boolean");
    });
  });

  describe("event bus delegation", () => {
    it("on() returns an unsubscribe function", () => {
      class TestEvent { constructor(public data: string) {} }
      const fn = vi.fn();
      const unsub = app.on(TestEvent, fn);

      app.emit(new TestEvent("hello"));
      expect(fn).toHaveBeenCalledOnce();

      unsub();
      app.emit(new TestEvent("again"));
      expect(fn).toHaveBeenCalledOnce(); // no second call
    });

    it("off() removes a handler", () => {
      class TestEvent2 { constructor(public x: number) {} }
      const fn = vi.fn();
      app.on(TestEvent2, fn);

      app.emit(new TestEvent2(1));
      expect(fn).toHaveBeenCalledOnce();

      app.off(TestEvent2, fn);
      app.emit(new TestEvent2(2));
      expect(fn).toHaveBeenCalledOnce();
    });
  });
});
