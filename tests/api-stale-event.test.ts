/**
 * ApiStale — staleness announced on the bus.
 *
 * `.stale` and `fetching` only tell the owning component. Anything else that
 * wants to react — a sync indicator, a cache layer, a second view — has no
 * reference to the accessor, so the transition is announced where the rest of
 * Loom announces things.
 */
import { describe, it, expect, vi } from "vitest";
import { createApiState } from "../src/query/state";
import { ApiStale } from "../src/query/events";
import { bus } from "../src/bus";

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

describe("ApiStale", () => {
  it("announces the transition, with the resolved key", async () => {
    const seen: ApiStale[] = [];
    const off = bus.on(ApiStale, (e) => seen.push(e));

    const host = { id: "42" };
    const s = createApiState<{ v: number }>(
      {
        fn: vi.fn().mockResolvedValue({ v: 1 }),
        key: (el: any) => `/api/users/${el.id}`,
        staleTime: 20,
      },
      () => {},
      host,
    );

    await tick();
    await tick(40);
    void s.data;   // the read past staleTime is what flips it
    await tick(10);

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]!.key).toBe("/api/users/42");
    expect(seen[0]!.host).toBe(host);
    off();
  });

  it("carries the accessor name, so a listener can tell queries apart", async () => {
    const seen: ApiStale[] = [];
    const off = bus.on(ApiStale, (e) => seen.push(e));

    const s = createApiState<{ v: number }>(
      { fn: vi.fn().mockResolvedValue({ v: 1 }), staleTime: 20 },
      () => {},
      {},
      "userQuery",
    );
    await tick();
    await tick(40);
    void s.data;
    await tick(10);

    expect(seen.some((e) => e.name === "userQuery")).toBe(true);
    off();
  });

  it("fires once per transition, not once per read", async () => {
    const seen: ApiStale[] = [];
    const off = bus.on(ApiStale, (e) => seen.push(e));

    const s = createApiState<{ v: number }>(
      { fn: vi.fn().mockResolvedValue({ v: 1 }), staleTime: 20, revalidate: false },
      () => {},
      {},
      "once",
    );
    await tick();
    await tick(40);

    void s.data; void s.data; void s.data;
    await tick(10);

    expect(seen.filter((e) => e.name === "once")).toHaveLength(1);
    off();
  });

  it("fires even when revalidate is off — that is the whole point of it", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const seen: ApiStale[] = [];
    const off = bus.on(ApiStale, (e) => seen.push(e));

    const s = createApiState<{ v: number }>(
      { fn, staleTime: 20, revalidate: false },
      () => {},
      {},
      "manual",
    );
    await tick();
    await tick(40);
    void s.data;
    await tick(10);

    expect(seen.some((e) => e.name === "manual")).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);   // announced, but nothing refetched
    off();
  });

  it("does not fire before staleTime elapses", async () => {
    const seen: ApiStale[] = [];
    const off = bus.on(ApiStale, (e) => seen.push(e));

    const s = createApiState<{ v: number }>(
      { fn: vi.fn().mockResolvedValue({ v: 1 }), staleTime: 10_000 },
      () => {},
      {},
      "fresh",
    );
    await tick();
    void s.data;
    await tick(20);

    expect(seen.filter((e) => e.name === "fresh")).toHaveLength(0);
    off();
  });

  it("a handler calling back into the accessor does not re-enter the render", async () => {
    // The emit is deferred to a microtask precisely so a handler that reads
    // .data or calls scheduleUpdate() cannot run inside the traced render
    // that triggered it.
    const s = createApiState<{ v: number }>(
      { fn: vi.fn().mockResolvedValue({ v: 1 }), staleTime: 20 },
      () => {},
      {},
      "reentrant",
    );
    const off = bus.on(ApiStale, () => { void s.data; });

    await tick();
    await tick(40);
    expect(() => { void s.data; }).not.toThrow();
    await tick(20);
    off();
  });
});
