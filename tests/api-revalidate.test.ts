/**
 * staleTime is stale-while-revalidate, not just stale.
 *
 * Marking alone was the whole of the old behaviour: checkStale() flipped a
 * boolean and nothing acted on it, so the flag sat true until something else
 * changed the key. Both the Fetch and RPC Queries pages described the
 * revalidating version, which did not exist.
 */
import { describe, it, expect, vi } from "vitest";
import { createApiState } from "../src/query/state";

const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

describe("staleTime revalidation", () => {
  it("refetches in the background once the data is stale", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const s = createApiState<{ v: number }>({ fn, staleTime: 20 }, () => {}, {});
    await tick();
    expect(s.data).toEqual({ v: 1 });
    expect(fn).toHaveBeenCalledTimes(1);

    await tick(40);          // past staleTime
    void s.data;             // the read a render would do
    await tick(20);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.data).toEqual({ v: 2 });
  });

  it("keeps the old data visible while revalidating", async () => {
    let release!: (v: { v: number }) => void;
    const fn = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockImplementationOnce(() => new Promise((r) => (release = r as any)));

    const s = createApiState<{ v: number }>({ fn, staleTime: 20 }, () => {}, {});
    await tick();
    await tick(40);
    void s.data;
    await tick(5);

    // mid-revalidation: busy, but the previous value is still renderable
    expect(s.fetching).toBe(true);
    expect(s.loading).toBe(false);
    expect(s.data).toEqual({ v: 1 });

    release({ v: 2 });
    await tick(10);
    expect(s.data).toEqual({ v: 2 });
    expect(s.fetching).toBe(false);
  });

  it("sends exactly one request no matter how many times it is read", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const s = createApiState<{ v: number }>({ fn, staleTime: 20 }, () => {}, {});
    await tick();
    await tick(40);

    void s.data; void s.data; void s.data; void s.data;
    await tick(20);

    expect(fn).toHaveBeenCalledTimes(2);   // the initial one, plus one revalidation
  });

  it("does not revalidate before staleTime elapses", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const s = createApiState<{ v: number }>({ fn, staleTime: 10_000 }, () => {}, {});
    await tick();
    void s.data;
    await tick(20);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(s.stale).toBe(false);
  });

  it("revalidate:false keeps the flag without refetching", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const s = createApiState<{ v: number }>(
      { fn, staleTime: 20, revalidate: false },
      () => {},
      {},
    );
    await tick();
    await tick(40);

    void s.data;
    await tick(20);

    expect(fn).toHaveBeenCalledTimes(1);   // nothing went out
    expect(s.stale).toBe(true);            // but the signal is there to act on
  });

  it("leaves staleTime:0 alone — every read is already fresh-by-definition", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const s = createApiState<{ v: number }>({ fn }, () => {}, {});
    await tick();
    void s.data; void s.data;
    await tick(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
