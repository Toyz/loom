/**
 * @api gating and in-flight reporting.
 *
 * Two gaps this covers:
 *  - the initial fetch was unconditional, so a query whose URL depends on a
 *    prop fired once before that prop existed;
 *  - `fetching` was tracked internally and never exposed, leaving no way to
 *    show a background revalidation without also blanking the screen, because
 *    `loading` is false once data exists.
 */
import { describe, it, expect, vi } from "vitest";
import { createApiState } from "../src/query/state";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("@api enabled gate", () => {
  it("does not fetch while the gate is shut", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const host = { ready: false };
    const s = createApiState<{ v: number }>(
      { fn, enabled: (el: any) => el.ready },
      () => {},
      host,
    );
    await tick(5);
    expect(fn).not.toHaveBeenCalled();
    // and it is not pretending to be busy
    expect(s.loading).toBe(false);
    expect(s.fetching).toBe(false);
    expect(s.data).toBeUndefined();
  });

  it("fetches on the first read after the gate opens", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 7 });
    const host = { ready: false };
    const s = createApiState<{ v: number }>(
      { fn, enabled: (el: any) => el.ready },
      () => {},
      host,
    );
    await tick(5);
    expect(fn).not.toHaveBeenCalled();

    host.ready = true;
    void s.data;          // the read a render would do
    await tick(10);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(s.data).toEqual({ v: 7 });
  });

  it("fetches immediately when no gate is declared", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 2 });
    createApiState<{ v: number }>({ fn }, () => {}, {});
    await tick(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("refetches when the gate reopens, even with data already loaded", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });
    const host = { ready: true };
    const s = createApiState<{ v: number }>(
      { fn, enabled: (el: any) => el.ready },
      () => {},
      host,
    );
    await tick(10);
    expect(s.data).toEqual({ v: 1 });

    // Close it -- switch tabs, log out -- and reopen.
    host.ready = false;
    void s.data;
    await tick(5);
    host.ready = true;
    void s.data;
    await tick(10);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.data).toEqual({ v: 2 });
  });

  it("serves what it has when the gate reopens inside staleTime", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const host = { ready: true };
    const s = createApiState<{ v: number }>(
      { fn, enabled: (el: any) => el.ready, staleTime: 60_000 },
      () => {},
      host,
    );
    await tick(10);

    host.ready = false;
    void s.data;
    await tick(5);
    host.ready = true;
    void s.data;
    await tick(10);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(s.data).toEqual({ v: 1 });
  });

  it("does not re-fire once the gate has opened and data arrived", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 3 });
    const host = { ready: true };
    const s = createApiState<{ v: number }>(
      { fn, enabled: (el: any) => el.ready },
      () => {},
      host,
    );
    await tick(10);
    void s.data; void s.data; void s.data;
    await tick(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("@api fetching", () => {
  it("separates the initial load from a background revalidation", async () => {
    let resolve!: (v: { v: number }) => void;
    const fn = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ v: 1 }))
      .mockImplementationOnce(() => new Promise((r) => (resolve = r as any)));

    const s = createApiState<{ v: number }>({ fn }, () => {}, {});
    await tick(10);
    expect(s.data).toEqual({ v: 1 });
    expect(s.loading).toBe(false);
    expect(s.fetching).toBe(false);

    // Refetch with data already present: busy, but there is something to show.
    const p = s.refetch();
    expect(s.fetching).toBe(true);
    expect(s.loading).toBe(false);       // would blank the UI if this were true
    expect(s.data).toEqual({ v: 1 });    // previous data still rendered

    resolve({ v: 2 });
    await p;
    expect(s.fetching).toBe(false);
    expect(s.data).toEqual({ v: 2 });
  });

  it("reports loading only when there is nothing to show", async () => {
    let resolve!: (v: { v: number }) => void;
    const fn = vi.fn().mockImplementation(() => new Promise((r) => (resolve = r as any)));
    const s = createApiState<{ v: number }>({ fn }, () => {}, {});

    expect(s.loading).toBe(true);
    expect(s.fetching).toBe(true);

    resolve({ v: 1 });
    await tick(10);
    expect(s.loading).toBe(false);
    expect(s.fetching).toBe(false);
  });
});
