/**
 * Tests: DI container lifecycle and @api request hygiene.
 *
 *  - @on handlers wired in start() stored no unsubscriber, and neither stop()
 *    nor reset() removed them, so start/stop/start double-dispatched forever
 *    and pinned the first-generation service instances alive on the bus.
 *  - @factory methods were invoked as a bare `await fn()`, so `this` was
 *    undefined and any factory touching an @inject accessor threw.
 *  - app.use() discriminated class-vs-factory with
 *    `fn.prototype?.constructor === fn`, true for EVERY non-arrow function
 *    declaration, so a named factory function got `new`-ed.
 *  - createApiState never checked signal.aborted after the awaited fetch, so a
 *    superseded slow response overwrote newer data; it also had no disposer, so
 *    an in-flight request outlived the host.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../src/app";
import { inject, factory } from "../src/app";
import { on } from "../src/decorators/events";
import { LoomEvent } from "../src/event";
import { createApiState } from "../src/query/state";
import type { ApiCtx } from "../src/query/types";

beforeEach(() => {
  app.reset();
});

class Ping extends LoomEvent {
  constructor(public n: number) { super(); }
}

// ── @on handler lifecycle ───────────────────────────────────────────────────

describe("@on handlers registered by start()", () => {
  it("fires once after start / stop / start", async () => {
    const seen = vi.fn();

    class Listener {
      @on(Ping)
      onPing(e: Ping) { seen(e.n); }
    }
    app.registerService(Listener);

    await app.start();
    app.stop();
    await app.start();

    app.emit(new Ping(1));
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("stops firing after stop()", async () => {
    const seen = vi.fn();

    class Listener {
      @on(Ping)
      onPing() { seen(); }
    }
    app.registerService(Listener);

    await app.start();
    app.stop();

    app.emit(new Ping(1));
    expect(seen).not.toHaveBeenCalled();
  });

  it("reset() also removes handlers", async () => {
    const seen = vi.fn();

    class Listener {
      @on(Ping)
      onPing() { seen(); }
    }
    app.registerService(Listener);

    await app.start();
    app.reset();

    app.emit(new Ping(1));
    expect(seen).not.toHaveBeenCalled();
  });
});

// ── @factory binding ────────────────────────────────────────────────────────

describe("@factory", () => {
  it("invokes the method with the owning instance as `this`", async () => {
    class Conn { readonly id = "conn-1"; }
    class Chat { constructor(public conn: Conn) {} }

    app.use(Conn, new Conn());

    class Boot {
      @inject(Conn) accessor conn!: Conn;

      @factory(Chat)
      createChat() {
        // `this` was undefined here, so this line threw.
        return new Chat(this.conn);
      }
    }
    app.registerService(Boot);

    await app.start();

    const chat = app.get<Chat>(Chat);
    expect(chat).toBeInstanceOf(Chat);
    expect(chat.conn.id).toBe("conn-1");
  });

  it("runs the factory exactly once", async () => {
    const built = vi.fn();
    class Thing { }

    class Boot {
      @factory(Thing)
      make() { built(); return new Thing(); }
    }
    app.registerService(Boot);

    await app.start();
    expect(built).toHaveBeenCalledTimes(1);
  });
});

// ── app.use() discrimination ────────────────────────────────────────────────

describe("app.use()", () => {
  it("treats a named function as a factory, not a class", () => {
    class Thing { readonly tag = "thing"; }

    app.use(function makeThing() { return new Thing(); });

    const got = app.get<Thing>(Thing);
    expect(got).toBeInstanceOf(Thing);
    expect(got.tag).toBe("thing");
  });

  it("still treats an arrow factory as a factory", () => {
    class Widget { readonly tag = "widget"; }
    app.use(() => new Widget());
    expect(app.get<Widget>(Widget)).toBeInstanceOf(Widget);
  });

  it("still instantiates a class", () => {
    class Store { readonly kind = "store"; }
    app.use(Store);
    expect(app.get<Store>(Store)).toBeInstanceOf(Store);
  });

  it("useClass / useFactory are unambiguous", () => {
    class A { }
    class B { }
    app.useClass(A);
    app.useFactory(() => new B());
    expect(app.get(A)).toBeInstanceOf(A);
    expect(app.get(B)).toBeInstanceOf(B);
  });
});

// ── @api request hygiene ────────────────────────────────────────────────────

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createApiState", () => {
  it("a superseded slow response does not overwrite newer data", async () => {
    const host = { id: 1 };
    let resolveSlow!: (v: string) => void;

    const state = createApiState<string>(
      {
        key: (el: any) => `/user/${el.id}`,
        fn: (el: any) =>
          el.id === 1
            ? new Promise<string>((r) => { resolveSlow = r; })
            : Promise.resolve("user-2"),
      },
      () => {},
      host,
    );

    await tick();
    host.id = 2;
    void state.data;      // key changed -> schedules the second fetch
    await tick();
    await tick();
    expect(state.data).toBe("user-2");

    // Now let the first, superseded request resolve.
    resolveSlow("user-1");
    await tick();
    await tick();

    expect(state.data).toBe("user-2");
  });

  it("dispose() aborts the in-flight request", async () => {
    let captured!: AbortSignal;
    const state = createApiState<string>(
      { fn: (_el: any, ctx: ApiCtx) => { captured = ctx.signal; return new Promise<string>(() => {}); } },
      () => {},
      {},
    );

    await tick();
    expect(captured.aborted).toBe(false);
    state.dispose();
    expect(captured.aborted).toBe(true);
  });

  it("passes an ApiCtx as the second argument", async () => {
    let seen: ApiCtx | undefined;
    createApiState<string>(
      { fn: async (_el: any, ctx: ApiCtx) => { seen = ctx; return "ok"; } },
      () => {},
      {},
    );

    await tick();
    expect(seen).toBeDefined();
    expect(typeof seen!.fetch).toBe("function");
    expect(seen!.headers).toEqual({});
  });

  it("ctx.fetch applies interceptor headers", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}"));
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      createApiState<string>(
        {
          fn: async (_el: any, ctx: ApiCtx) => {
            ctx.headers["Authorization"] = "Bearer t";
            await ctx.fetch("/api/thing");
            return "ok";
          },
        },
        () => {},
        {},
      );
      await tick();
      await tick();

      expect(fetchSpy).toHaveBeenCalled();
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer t");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("does not start a fetch synchronously from the data getter", async () => {
    const fn = vi.fn(async () => "v");
    const host = { id: 1 };
    const state = createApiState<string>(
      { key: (el: any) => String(el.id), fn },
      () => {},
      host,
    );
    await tick();
    fn.mockClear();

    host.id = 2;
    void state.data;
    // The refetch must be deferred, not run during the property read.
    expect(fn).not.toHaveBeenCalled();

    await tick();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
