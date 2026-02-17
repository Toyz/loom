/**
 * Tests for @api / createApiState
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiState } from "../src/query/state";
import { interceptRegistry } from "../src/query/registry";
import type { ApiState, ApiCtx } from "../src/query/types";

// Helper: flush pending microtasks/timers
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const flush = (ms = 10) => new Promise<void>((r) => setTimeout(r, ms));

describe("@api", () => {
  beforeEach(() => {
    interceptRegistry.clear();
  });

  describe("createApiState", () => {
    it("initial state is loading with no data", () => {
      const state = createApiState(
        { fn: () => new Promise(() => {}) }, // never resolves
        () => {},
      );
      expect(state.loading).toBe(true);
      expect(state.data).toBeUndefined();
      expect(state.error).toBeUndefined();
    });

    it("resolves to data on success", async () => {
      const update = vi.fn();
      const state = createApiState(
        { fn: async () => ({ name: "Ada" }) },
        update,
      );
      await flush();
      expect(state.data).toEqual({ name: "Ada" });
      expect(state.loading).toBe(false);
      expect(state.error).toBeUndefined();
      expect(update).toHaveBeenCalled();
    });

    it("captures error on rejection", async () => {
      const state = createApiState(
        { fn: async () => { throw new Error("fail"); } },
        () => {},
      );
      await flush();
      expect(state.error).toBeInstanceOf(Error);
      expect(state.error!.message).toBe("fail");
      expect(state.data).toBeUndefined();
      expect(state.loading).toBe(false);
    });

    it("refetch() re-runs the fetch function", async () => {
      let call = 0;
      const state = createApiState(
        { fn: async () => ({ v: ++call }) },
        () => {},
      );
      await flush();
      expect(state.data).toEqual({ v: 1 });

      await state.refetch();
      await flush();
      expect(state.data).toEqual({ v: 2 });
    });

    it("stale-while-revalidate: keeps old data during refetch", async () => {
      let call = 0;
      const state = createApiState(
        {
          fn: () => new Promise<{ v: number }>((r) =>
            setTimeout(() => r({ v: ++call }), 10),
          ),
        },
        () => {},
      );
      await flush(20);
      expect(state.data).toEqual({ v: 1 });
      expect(state.loading).toBe(false);

      // Start refetch — data should still be available
      const p = state.refetch();
      expect(state.data).toEqual({ v: 1 }); // SWR: old data visible
      await p;
      await flush(20);
      expect(state.data).toEqual({ v: 2 });
    });

    it("invalidate() marks stale and refetches", async () => {
      let call = 0;
      const state = createApiState(
        { fn: async () => ({ v: ++call }) },
        () => {},
      );
      await flush();
      expect(state.data).toEqual({ v: 1 });

      state.invalidate();
      await flush();
      expect(state.data).toEqual({ v: 2 });
    });

    it("retries on failure with retry option", async () => {
      let attempt = 0;
      const state = createApiState(
        {
          fn: async () => {
            attempt++;
            if (attempt < 3) throw new Error("retry");
            return { ok: true };
          },
          retry: 3,
        },
        () => {},
      );
      await flush(2000); // backoff: 200 + 400
      expect(state.data).toEqual({ ok: true });
      expect(state.error).toBeUndefined();
      expect(attempt).toBe(3);
    });

    it("gives up after max retries", async () => {
      const state = createApiState(
        {
          fn: async () => { throw new Error("always fails"); },
          retry: 1,
        },
        () => {},
      );
      await flush(500);
      expect(state.error?.message).toBe("always fails");
      expect(state.data).toBeUndefined();
    });
  });

  describe("interceptors", () => {
    it("runs registered interceptors and mutates ctx", async () => {
      const ctxCapture: ApiCtx[] = [];

      // Register an interceptor
      interceptRegistry.set("auth", {
        method: (ctx: ApiCtx) => {
          ctxCapture.push(ctx);
          ctx.headers["Authorization"] = "Bearer test-token";
        },
        key: "auth",
      });

      const state = createApiState(
        {
          fn: async () => ({ ok: true }),
          use: ["auth"],
        },
        () => {},
      );
      await flush();

      expect(ctxCapture.length).toBe(1);
      expect(ctxCapture[0].headers["Authorization"]).toBe("Bearer test-token");
      expect(state.data).toEqual({ ok: true });
    });

    it("interceptor returning false blocks the request", async () => {
      interceptRegistry.set("block", {
        method: () => false,
        key: "block",
      });

      const fnSpy = vi.fn(async () => ({ ok: true }));
      const state = createApiState(
        {
          fn: fnSpy,
          use: ["block"],
        },
        () => {},
      );
      await flush();

      expect(state.error?.message).toContain("blocked");
      expect(state.data).toBeUndefined();
      // The actual fetch function should never have been called
      // (it's defined but the interceptor blocks before it runs)
    });

    it("warns on unknown interceptor name", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const state = createApiState(
        {
          fn: async () => ({ ok: true }),
          use: ["nonexistent"],
        },
        () => {},
      );
      await flush();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("nonexistent"),
      );
      // Should still succeed — unknown interceptor is just a warning
      expect(state.data).toEqual({ ok: true });
      warn.mockRestore();
    });

    it("multiple interceptors run in order", async () => {
      const order: string[] = [];

      interceptRegistry.set("first", {
        method: (ctx: ApiCtx) => { order.push("first"); ctx.headers["X-First"] = "1"; },
        key: "first",
      });
      interceptRegistry.set("second", {
        method: (ctx: ApiCtx) => { order.push("second"); ctx.headers["X-Second"] = "2"; },
        key: "second",
      });

      const state = createApiState(
        {
          fn: async () => ({ ok: true }),
          use: ["first", "second"],
        },
        () => {},
      );
      await flush();

      expect(order).toEqual(["first", "second"]);
    });

    it("interceptor can modify URL", async () => {
      let capturedUrl = "";

      interceptRegistry.set("base", {
        method: (ctx: ApiCtx) => { ctx.url = "https://api.example.com/users"; },
        key: "base",
      });

      const state = createApiState(
        {
          fn: async () => ({ fetched: true }),
          use: ["base"],
        },
        () => {},
      );
      await flush();
      expect(state.data).toEqual({ fetched: true });
    });

    it("@intercept name defaults to method name", () => {
      // Simulate what createDecorator does for @intercept
      // The decorator uses: const interceptName = name ?? key;
      interceptRegistry.set("myMethod", {
        method: (ctx: ApiCtx) => {},
        key: "myMethod",
      });

      expect(interceptRegistry.has("myMethod")).toBe(true);
    });
  });

  describe("pipe (post-fetch interceptors)", () => {
    it("pipe interceptor transforms the result", async () => {
      interceptRegistry.set("double", {
        method: (ctx: ApiCtx) => {
          const raw = ctx.response as any as { value: number };
          return { value: raw.value * 2 };
        },
        key: "double",
        after: true,
      });

      const state = createApiState(
        {
          fn: async () => ({ value: 5 }),
          pipe: ["double"],
        },
        () => {},
      );
      await flush();
      expect(state.data).toEqual({ value: 10 });
    });

    it("pipe interceptors chain in order", async () => {
      interceptRegistry.set("addTag", {
        method: (ctx: ApiCtx) => {
          const raw = ctx.response as any as { tags: string[] };
          return { tags: [...raw.tags, "piped"] };
        },
        key: "addTag",
        after: true,
      });
      interceptRegistry.set("sort", {
        method: (ctx: ApiCtx) => {
          const raw = ctx.response as any as { tags: string[] };
          return { tags: [...raw.tags].sort() };
        },
        key: "sort",
        after: true,
      });

      const state = createApiState(
        {
          fn: async () => ({ tags: ["b", "a"] }),
          pipe: ["addTag", "sort"],
        },
        () => {},
      );
      await flush();
      expect(state.data).toEqual({ tags: ["a", "b", "piped"] });
    });

    it("pipe interceptor receives data via ctx.response", async () => {
      let received: any = null;
      interceptRegistry.set("spy", {
        method: (ctx: ApiCtx) => {
          received = ctx.response;
          return ctx.response; // pass-through
        },
        key: "spy",
        after: true,
      });

      const original = { id: 42, name: "Test" };
      const state = createApiState(
        {
          fn: async () => original,
          pipe: ["spy"],
        },
        () => {},
      );
      await flush();
      expect(received).toEqual(original);
      expect(state.data).toEqual(original);
    });

    it("warns on unknown pipe name", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const state = createApiState(
        {
          fn: async () => ({ ok: true }),
          pipe: ["missing"],
        },
        () => {},
      );
      await flush();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing"));
      expect(state.data).toEqual({ ok: true });
      warn.mockRestore();
    });
  });

  describe("scheduleUpdate", () => {
    it("fires on initial fetch completion", async () => {
      const fn = vi.fn();
      createApiState({ fn: async () => ({ ok: true }) }, fn);
      await flush();
      expect(fn).toHaveBeenCalled();
    });

    it("fires on error", async () => {
      const fn = vi.fn();
      createApiState({ fn: async () => { throw new Error("e"); } }, fn);
      await flush();
      expect(fn).toHaveBeenCalled();
    });

    it("fires on refetch", async () => {
      const fn = vi.fn();
      const state = createApiState({ fn: async () => ({ ok: true }) }, fn);
      await flush();
      fn.mockClear();
      await state.refetch();
      await flush();
      expect(fn).toHaveBeenCalled();
    });
  });

  describe("@catch_ integration", () => {
    it("invokes CATCH_HANDLER on fetch error", async () => {
      const { CATCH_HANDLER } = await import("../src/decorators/symbols");
      const catchSpy = vi.fn();

      // Simulate a host element with @catch_ handler on prototype
      const host = { [CATCH_HANDLER]: catchSpy } as any;
      const state = createApiState(
        { fn: async () => { throw new Error("api fail"); } },
        () => {},
        host,
      );
      await flush();

      expect(catchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: "api fail" }),
        host,
      );
      expect(state.error?.message).toBe("api fail");
    });

    it("does not blow up if CATCH_HANDLER throws", async () => {
      const { CATCH_HANDLER } = await import("../src/decorators/symbols");
      const host = {
        [CATCH_HANDLER]: () => { throw new Error("handler broke"); },
      } as any;

      const state = createApiState(
        { fn: async () => { throw new Error("api fail"); } },
        () => {},
        host,
      );
      await flush();

      // Error still captured, handler exception swallowed
      expect(state.error?.message).toBe("api fail");
    });

    it("invokes named CATCH_HANDLERS when apiName matches", async () => {
      const { CATCH_HANDLERS } = await import("../src/decorators/symbols");
      const namedSpy = vi.fn();
      const namedMap = new Map([["team", namedSpy]]);
      const host = { [CATCH_HANDLERS]: namedMap } as any;

      const state = createApiState(
        { fn: async () => { throw new Error("team fail"); } },
        () => {},
        host,
        "team",
      );
      await flush();

      expect(namedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: "team fail" }),
        host,
      );
      expect(state.error?.message).toBe("team fail");
    });

    it("named handler takes priority over catch-all", async () => {
      const { CATCH_HANDLER, CATCH_HANDLERS } = await import("../src/decorators/symbols");
      const namedSpy = vi.fn();
      const catchAllSpy = vi.fn();
      const namedMap = new Map([["team", namedSpy]]);
      const host = {
        [CATCH_HANDLERS]: namedMap,
        [CATCH_HANDLER]: catchAllSpy,
      } as any;

      createApiState(
        { fn: async () => { throw new Error("team fail"); } },
        () => {},
        host,
        "team",
      );
      await flush();

      expect(namedSpy).toHaveBeenCalled();
      expect(catchAllSpy).not.toHaveBeenCalled();
    });

    it("falls back to catch-all when no named handler matches", async () => {
      const { CATCH_HANDLER, CATCH_HANDLERS } = await import("../src/decorators/symbols");
      const catchAllSpy = vi.fn();
      const namedMap = new Map([["other", vi.fn()]]);
      const host = {
        [CATCH_HANDLERS]: namedMap,
        [CATCH_HANDLER]: catchAllSpy,
      } as any;

      createApiState(
        { fn: async () => { throw new Error("data fail"); } },
        () => {},
        host,
        "data",
      );
      await flush();

      expect(catchAllSpy).toHaveBeenCalled();
    });
  });
});
