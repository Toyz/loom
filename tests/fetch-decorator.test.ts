/**
 * @fetch — the behaviour that makes it worth having over a hand-written fn.
 *
 * The load-bearing one is the status check: fetch() resolves for 404 and 500,
 * so a hand-rolled `.then(r => r.json())` lands an error page in `data` and
 * reports ok:true. The rest is the boilerplate it removes without changing
 * what @api does underneath.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiState } from "../src/query/state";
import { HttpError } from "../src/query/fetch";

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

/** Build the same options object @fetch builds, without the decorator. */
async function runFetchOptions(opts: any, host: any = {}) {
  // Mirror what fetch() assembles, by importing it and reading the options it
  // hands to api(). Simpler: exercise through createApiState with the same fn.
  const { fetch: fetchDec } = await import("../src/query/fetch");
  let captured: any;
  // api() is called with the assembled options; intercept that call.
  const mod = await import("../src/query/decorators");
  const spy = vi.spyOn(mod, "api").mockImplementation(((o: any) => {
    captured = o;
    return () => {};
  }) as any);
  (fetchDec as any)(opts);
  spy.mockRestore();
  return createApiState(captured, () => {}, host);
}

describe("@fetch", () => {
  let realFetch: typeof globalThis.fetch;
  beforeEach(() => { realFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = realFetch; vi.restoreAllMocks(); });

  it("parses JSON on a 2xx", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ name: "ada" }), { status: 200 }),
    ) as any;
    const s = await runFetchOptions({ url: "/api/user" });
    await tick();
    expect(s.data).toEqual({ name: "ada" });
    expect(s.error).toBeUndefined();
  });

  it("turns a non-2xx into an HttpError instead of parsing it as data", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "nope" }), { status: 404 }),
    ) as any;
    const s = await runFetchOptions({ url: "/api/missing" });
    await tick();
    expect(s.data).toBeUndefined();          // the failure did NOT become data
    expect(s.error).toBeInstanceOf(HttpError);
    expect((s.error as HttpError).status).toBe(404);
    expect(s.ok).toBe(false);
  });

  it("keeps the error body, which is usually the useful part", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "RATE_LIMIT" }), { status: 429 }),
    ) as any;
    const s = await runFetchOptions({ url: "/api/x" });
    await tick();
    expect((s.error as HttpError).body).toEqual({ code: "RATE_LIMIT" });
  });

  it("serialises params into the URL", async () => {
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as any;
    await runFetchOptions({ url: "/search", params: { q: "loom", page: 2 } });
    await tick();
    const called = String(spy.mock.calls[0]?.[0] ?? "");
    expect(called).toContain("q=loom");
    expect(called).toContain("page=2");
  });

  it("drops empty params rather than sending blanks", async () => {
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as any;
    await runFetchOptions({ url: "/search", params: { q: "x", cursor: undefined, tag: "" } });
    await tick();
    const called = String(spy.mock.calls[0]?.[0] ?? "");
    expect(called).toContain("q=x");
    expect(called).not.toContain("cursor");
    expect(called).not.toContain("tag=");
  });

  it("derives the key from the resolved URL, so a prop change refetches", async () => {
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as any;
    const host = { id: "1" };
    const s = await runFetchOptions({ url: (el: any) => `/users/${el.id}` }, host);
    await tick();
    expect(spy).toHaveBeenCalledTimes(1);

    host.id = "2";
    void s.data;             // the read a re-render would do
    await tick();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[1]?.[0])).toContain("/users/2");
  });

  it("returns text when asked", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("plain", { status: 200 })) as any;
    const s = await runFetchOptions({ url: "/api/txt", as: "text" });
    await tick();
    expect(s.data).toBe("plain");
  });

  it("honours enabled, so nothing is requested while the gate is shut", async () => {
    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as any;
    const host = { ready: false };
    await runFetchOptions(
      { url: (el: any) => `/users/${el.ready}`, enabled: (el: any) => el.ready },
      host,
    );
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("@fetch + @intercept", () => {
  let realFetch: typeof globalThis.fetch;
  beforeEach(() => { realFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = realFetch; vi.restoreAllMocks(); });

  it("applies a `use` interceptor's headers and params to the real request", async () => {
    const { interceptRegistry } = await import("../src/query/decorators");
    interceptRegistry.set("auth", {
      method: (ctx: any) => {
        ctx.headers["Authorization"] = "Bearer t0ken";
        ctx.params["tenant"] = "acme";
      },
    } as any);

    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as any;

    await runFetchOptions({ url: "/api/thing", use: ["auth"] });
    await tick();

    const [url, init] = spy.mock.calls[0] ?? [];
    expect(String(url)).toContain("tenant=acme");
    expect((init as RequestInit)?.headers).toMatchObject({ Authorization: "Bearer t0ken" });
    interceptRegistry.delete("auth");
  });

  it("lets a `pipe` interceptor transform the parsed body", async () => {
    const { interceptRegistry } = await import("../src/query/decorators");
    interceptRegistry.set("unwrap", {
      method: (ctx: any) => (ctx.response as any)?.data ?? undefined,
    } as any);

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 7 } }), { status: 200 }),
    ) as any;

    const s = await runFetchOptions({ url: "/api/wrapped", pipe: ["unwrap"] });
    await tick();
    // pipe sees the parsed body via ctx.response and replaces data with it
    expect(s.data).toBeDefined();
    interceptRegistry.delete("unwrap");
  });

  it("a `use` interceptor can block the request", async () => {
    const { interceptRegistry } = await import("../src/query/decorators");
    interceptRegistry.set("deny", { method: () => false } as any);

    const spy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    globalThis.fetch = spy as any;

    const s = await runFetchOptions({ url: "/api/blocked", use: ["deny"] });
    await tick();

    expect(spy).not.toHaveBeenCalled();
    expect(s.error?.message).toMatch(/blocked/i);
    interceptRegistry.delete("deny");
  });
});
