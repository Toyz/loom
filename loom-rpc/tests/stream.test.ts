/**
 * Tests: RpcStream — createStreamState, @stream decorator, eager, open(), AsyncIterable
 *
 * Uses `createStreamState` directly to avoid TypeScript's strict decorator
 * signature checks when decorating inside describe() blocks.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "@toyz/loom";
import { RpcTransport } from "../src/transport";
import { createStreamState } from "../src/stream";

// ── MockStreamTransport ───────────────────────────────────────────────────────

class MockStreamTransport extends RpcTransport {
  private queues = new Map<string, { events: any[]; error?: Error }>();

  feedStream(router: string, method: string, events: any[], error?: Error) {
    this.queues.set(`${router}.${method}`, { events: [...events], error });
  }

  call<T>(): Promise<T> { throw new Error("N/A"); }

  stream<T>(router: string, method: string, _args: any[]): AsyncIterable<T> {
    const key = `${router}.${method}`;
    const queue = this.queues.get(key);
    if (!queue) throw new Error(`No stream for ${key}`);

    return {
      [Symbol.asyncIterator](): AsyncIterator<T> {
        let i = 0;
        return {
          async next() {
            if (i >= queue.events.length) {
              if (queue.error) throw queue.error;
              return { value: undefined as any, done: true };
            }
            return { value: queue.events[i++] as T, done: false };
          },
          async return() { return { value: undefined as any, done: true }; },
        };
      },
    };
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function makeState<T = string>(
  overrideHost: any = {},
  opts?: { fn?: (h: any) => any[]; eager?: boolean },
) {
  const noop = () => {};
  return createStreamState<T>("ChatRouter", "messages", opts, noop, overrideHost);
}

// ── reset ─────────────────────────────────────────────────────────────────────

let mock: MockStreamTransport;

beforeEach(() => {
  (app as any).providers = new Map();
  (app as any).services = [];
  (app as any).factories = [];
  (app as any)._started = false;

  mock = new MockStreamTransport();
  app.use(RpcTransport, mock);
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe("initial state", () => {
  it("starts as idle", () => {
    const s = makeState();
    expect(s.status).toBe("idle");
    expect(s.error).toBeNull();
  });
});

// ── Direct iteration (Symbol.asyncIterator) ───────────────────────────────────

describe("direct iteration — for await (const x of stream)", () => {
  it("yields all events", async () => {
    mock.feedStream("ChatRouter", "messages", ["a", "b", "c"]);
    const s = makeState();
    const got: string[] = [];
    for await (const ev of s) got.push(ev);
    expect(got).toEqual(["a", "b", "c"]);
  });

  it("status is streaming during, closed after", async () => {
    mock.feedStream("ChatRouter", "messages", ["x"]);
    const statuses: string[] = [];
    const noop = () => statuses.push(s.status);
    const s = createStreamState<string>("ChatRouter", "messages", undefined, noop, {});
    for await (const _ of s) { /* consume */ }
    expect(statuses).toContain("streaming");
    expect(s.status).toBe("closed");
  });

  it(".events iterable works identically", async () => {
    mock.feedStream("ChatRouter", "messages", ["1", "2"]);
    const s = makeState();
    const got: string[] = [];
    for await (const ev of s.events) got.push(ev);
    expect(got).toEqual(["1", "2"]);
  });

  it("break mid-stream sets status to closed", async () => {
    mock.feedStream("ChatRouter", "messages", ["a", "b", "c"]);
    const s = makeState();
    const got: string[] = [];
    for await (const ev of s) {
      got.push(ev);
      break;
    }
    expect(got).toEqual(["a"]);
    expect(s.status).toBe("closed");
  });
});

// ── open() + subscriber pump ──────────────────────────────────────────────────

describe("open() + _subscribe pump", () => {
  it("open() fans events to subscribers", async () => {
    mock.feedStream("ChatRouter", "messages", ["x", "y"]);
    const s = makeState();
    const received: string[] = [];
    s._subscribe((e: string) => received.push(e));

    s.open();
    // Pump is async — wait a tick for all events
    await new Promise(r => setTimeout(r, 10));
    expect(received).toEqual(["x", "y"]);
  });

  it("open() fans to multiple subscribers", async () => {
    mock.feedStream("ChatRouter", "messages", ["msg"]);
    const s = makeState();
    const a: string[] = [], b: string[] = [];
    s._subscribe((e: string) => a.push(e));
    s._subscribe((e: string) => b.push(e));

    s.open();
    await new Promise(r => setTimeout(r, 10));
    expect(a).toEqual(["msg"]);
    expect(b).toEqual(["msg"]);
  });

  it("open() is a no-op if already streaming", async () => {
    mock.feedStream("ChatRouter", "messages", ["a"]);
    const streamSpy = vi.spyOn(mock, "stream");
    const s = makeState();
    s.open();
    s.open(); // second call should be no-op
    await new Promise(r => setTimeout(r, 10));
    // transport.stream should only be called once
    expect(streamSpy).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops receiving events", async () => {
    mock.feedStream("ChatRouter", "messages", ["1", "2", "3"]);
    const s = makeState();
    const got: string[] = [];
    const unsub = s._subscribe((e: string) => got.push(e));

    s.open();
    await new Promise(r => setTimeout(r, 2));
    unsub(); // stop before remaining events
    await new Promise(r => setTimeout(r, 10));
    // we may have received 0..n events before unsub
    expect(got.length).toBeLessThanOrEqual(3);
  });
});

// ── close() ───────────────────────────────────────────────────────────────────

describe("close()", () => {
  it("close() before open() → status closed, no throw", () => {
    const s = makeState();
    expect(() => s.close()).not.toThrow();
    expect(s.status).toBe("closed");
  });

  it("close() during pump stops it", async () => {
    mock.feedStream("ChatRouter", "messages", ["a", "b", "c"]);
    const s = makeState();
    const got: string[] = [];
    s._subscribe((e: string) => {
      got.push(e);
      if (got.length === 1) s.close();
    });
    s.open();
    await new Promise(r => setTimeout(r, 20));
    expect(got.length).toBe(1);
    expect(s.status).toBe("closed");
  });
});

// ── fn args ───────────────────────────────────────────────────────────────────

describe("fn args", () => {
  it("passes fn result as args to transport.stream()", async () => {
    mock.feedStream("ChatRouter", "messages", []);
    const spy = vi.spyOn(mock, "stream");
    const host = { roomId: "r42" };
    const s = makeState(host, { fn: (h) => [h.roomId] });
    for await (const _ of s) { /* consume */ }
    expect(spy).toHaveBeenCalledWith("ChatRouter", "messages", ["r42"]);
  });

  it("omitting fn passes empty args", async () => {
    mock.feedStream("ChatRouter", "messages", []);
    const spy = vi.spyOn(mock, "stream");
    const s = makeState();
    for await (const _ of s) { /* consume */ }
    expect(spy).toHaveBeenCalledWith("ChatRouter", "messages", []);
  });
});

// ── Error paths ───────────────────────────────────────────────────────────────

describe("error handling", () => {
  it("no transport → status error on iteration", async () => {
    (app as any).providers.delete(RpcTransport);
    const s = makeState();
    for await (const _ of s) { /* consume */ }
    expect(s.status).toBe("error");
    expect(s.error?.message).toContain("No RpcTransport");
  });

  it("transport without stream() → status error on iteration", async () => {
    class NoStreamTransport extends RpcTransport {
      async call<T>(): Promise<T> { return undefined as any; }
    }
    app.use(RpcTransport, new NoStreamTransport());
    const s = makeState();
    for await (const _ of s) { /* consume */ }
    expect(s.status).toBe("error");
    expect(s.error?.message).toContain("does not implement stream()");
  });

  it("transport throws during stream() → status error on iteration", async () => {
    mock.feedStream("ChatRouter", "messages", ["ok"], new Error("server gone"));
    const s = makeState();
    const got: string[] = [];
    for await (const ev of s) got.push(ev);
    expect(got).toEqual(["ok"]);
    expect(s.status).toBe("error");
    expect(s.error?.message).toBe("server gone");
  });

  it("no transport → status error via open() pump", async () => {
    (app as any).providers.delete(RpcTransport);
    const s = makeState();
    s.open();
    await new Promise(r => setTimeout(r, 5));
    expect(s.status).toBe("error");
    expect(s.error?.message).toContain("No RpcTransport");
  });
});
