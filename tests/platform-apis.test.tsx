/**
 * @idle, @animate, @sse, @socket, IndexedDBAdapter, device APIs, selection.
 *
 * Every one of these wraps a browser API that happy-dom lacks or only
 * partially implements, so the fakes here are the API surface each wrapper
 * drives. What is under test is the bookkeeping -- cancellation, teardown,
 * backoff, fallback -- which is the part that is ours and the part that
 * hand-rolled versions get wrong.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement, component } from "../src/index";
import { idle } from "../src/element/timing";
import { animate, animateElement, supportsAnimations } from "../src/element/animate";
import { sse, socket } from "../src/element/stream";
import { geolocation, wakeLock, share, canShare } from "../src/element/device";
import { readSelection, highlight, findRanges, supportsHighlights } from "../src/element/selection";
import { MemoryStorage } from "../src/store/storage";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
let tag = 0;
const nextTag = () => `plat-el-${++tag}`;

async function mount<T = any>(Cls: any, base: string): Promise<T> {
  customElements.define(base, class extends Cls {});
  const el = document.createElement(base) as any;
  document.body.appendChild(el);
  await tick();
  return el;
}

afterEach(() => { document.body.innerHTML = ""; });

describe("@idle", () => {
  it("uses requestIdleCallback and cancels on disconnect", async () => {
    const ric = vi.fn((cb: () => void) => { setTimeout(cb, 1); return 7; });
    const cancel = vi.fn();
    (globalThis as any).requestIdleCallback = ric;
    (globalThis as any).cancelIdleCallback = cancel;

    const ran = vi.fn();
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @idle()
      work() { ran(); }
    }
    const el = await mount(El, t + "-x");
    expect(ric).toHaveBeenCalled();

    el.remove();
    expect(cancel).toHaveBeenCalledWith(7);

    delete (globalThis as any).requestIdleCallback;
    delete (globalThis as any).cancelIdleCallback;
  });

  it("falls back to a timer on Safari, which has never shipped it", async () => {
    expect((globalThis as any).requestIdleCallback).toBeUndefined();
    const ran = vi.fn();
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @idle({ timeout: 1 })
      work() { ran(); }
    }
    await mount(El, t + "-x");
    await tick(10);
    expect(ran).toHaveBeenCalled();
  });
});

describe("@animate", () => {
  it("is a no-op where the Web Animations API is missing", () => {
    expect(supportsAnimations()).toBe(false);
    const el = document.createElement("div");
    const { animation, cancel } = animateElement(el, [{ opacity: 0 }], 100);
    expect(animation).toBeNull();
    expect(() => cancel()).not.toThrow();
  });

  it("starts on connect and cancels on disconnect", async () => {
    const cancel = vi.fn();
    (Element.prototype as any).animate = vi.fn(() => ({
      cancel, finish() {}, play() {}, pause() {},
    }));

    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @animate(".dot", [{ opacity: 1 }, { opacity: 0 }], { duration: 100 })
      pulse!: () => unknown;
      update() { return <span class="dot" />; }
    }
    const el = await mount(El, t + "-x");
    expect((Element.prototype as any).animate).toHaveBeenCalled();

    // An Animation outlives the element it was started on, so a component
    // that never cancels leaks a running one per mount.
    el.remove();
    expect(cancel).toHaveBeenCalled();

    delete (Element.prototype as any).animate;
  });
});

describe("@sse", () => {
  class FakeES {
    static instances: FakeES[] = [];
    onmessage: ((e: any) => void) | null = null;
    onopen: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    readyState = 1;
    closed = false;
    constructor(public url: string) { FakeES.instances.push(this); }
    close() { this.closed = true; }
  }

  it("delivers messages and closes on disconnect", async () => {
    FakeES.instances = [];
    (globalThis as any).EventSource = FakeES;

    const got: string[] = [];
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @sse("/events")
      onEvent(e: any) { got.push(e.data); }
    }
    const el = await mount(El, t + "-x");

    const es = FakeES.instances[0]!;
    es.onmessage?.({ data: "hello" });
    expect(got).toEqual(["hello"]);

    el.remove();
    expect(es.closed).toBe(true);

    delete (globalThis as any).EventSource;
  });

  it("takes a url built from the host", async () => {
    FakeES.instances = [];
    (globalThis as any).EventSource = FakeES;

    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      roomId = "42";
      @sse((el: any) => `/rooms/${el.roomId}`)
      onEvent() {}
    }
    await mount(El, t + "-x");
    expect(FakeES.instances[0]!.url).toBe("/rooms/42");

    delete (globalThis as any).EventSource;
  });
});

describe("@socket", () => {
  class FakeWS {
    static instances: FakeWS[] = [];
    onmessage: ((e: any) => void) | null = null;
    onopen: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    onclose: (() => void) | null = null;
    closed = false;
    constructor(public url: string) { FakeWS.instances.push(this); }
    close() { this.closed = true; }
  }

  it("delivers messages and closes on disconnect", async () => {
    FakeWS.instances = [];
    (globalThis as any).WebSocket = FakeWS;

    const got: string[] = [];
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @socket("wss://x/feed")
      onMsg(e: any) { got.push(e.data); }
    }
    const el = await mount(El, t + "-x");

    const ws = FakeWS.instances[0]!;
    ws.onmessage?.({ data: "tick" });
    expect(got).toEqual(["tick"]);

    el.remove();
    expect(ws.closed).toBe(true);
    // Handlers dropped before close, so teardown cannot schedule a reconnect
    // for a component that is already gone.
    expect(ws.onclose).toBeNull();
  });

  it("reconnects with backoff after a drop", async () => {
    FakeWS.instances = [];
    (globalThis as any).WebSocket = FakeWS;

    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @socket("wss://x/feed", { retryDelay: 5 })
      onMsg() {}
    }
    const el = await mount(El, t + "-x");
    expect(FakeWS.instances).toHaveLength(1);

    FakeWS.instances[0]!.onclose?.();
    await tick(20);
    expect(FakeWS.instances.length).toBeGreaterThan(1);

    el.remove();
  });

  it("stops reconnecting once disconnected", async () => {
    FakeWS.instances = [];
    (globalThis as any).WebSocket = FakeWS;

    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @socket("wss://x/feed", { retryDelay: 5 })
      onMsg() {}
    }
    const el = await mount(El, t + "-x");
    el.remove();

    const count = FakeWS.instances.length;
    await tick(30);
    expect(FakeWS.instances).toHaveLength(count);

    delete (globalThis as any).WebSocket;
  });
});

describe("IndexedDBAdapter", () => {
  it("serves reads from memory when IndexedDB is absent", async () => {
    // happy-dom has no indexedDB, which is also a private-mode browser.
    const { IndexedDBAdapter } = await import("../src/store/storage");
    const db = new IndexedDBAdapter("t");
    await db.ready;

    db.set("a", "1");
    expect(db.get("a")).toBe("1");   // synchronous read-after-write
    db.remove("a");
    expect(db.get("a")).toBeNull();
  });

  it("satisfies the StorageAdapter contract MemoryStorage does", async () => {
    const { IndexedDBAdapter } = await import("../src/store/storage");
    const a = new IndexedDBAdapter("t2");
    const b = new MemoryStorage();
    for (const s of [a, b]) {
      expect(s.get("missing")).toBeNull();
      s.set("k", "v");
      expect(s.get("k")).toBe("v");
    }
  });
});

describe("device APIs", () => {
  it("@geolocation clears its watch on disconnect", async () => {
    const clearWatch = vi.fn();
    const watchPosition = vi.fn(() => 3);
    Object.defineProperty(navigator, "geolocation", {
      value: { watchPosition, clearWatch }, configurable: true,
    });

    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @geolocation({ enableHighAccuracy: true })
      onMove() {}
    }
    const el = await mount(El, t + "-x");
    expect(watchPosition).toHaveBeenCalled();

    // Left running, a high-accuracy watch keeps the GPS on with nothing on
    // screen to explain the battery drain.
    el.remove();
    expect(clearWatch).toHaveBeenCalledWith(3);
  });

  it("@wakeLock acquires and releases", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const sentinel = { released: false, release, addEventListener() {} };
    const request = vi.fn().mockResolvedValue(sentinel);
    Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });

    const t = nextTag();
    @component(t)
    @wakeLock
    class El extends LoomElement {}
    const el = await mount(El, t + "-x");
    await tick();
    expect(request).toHaveBeenCalledWith("screen");

    el.remove();
    await tick();
    expect(release).toHaveBeenCalled();
  });

  it("share reports false rather than throwing when unavailable", async () => {
    expect(canShare()).toBe(false);
    await expect(share({ title: "x" })).resolves.toBe(false);
  });

  it("share treats a dismissed sheet as false, not an error", async () => {
    Object.defineProperty(navigator, "share", {
      value: () => Promise.reject(Object.assign(new Error("cancel"), { name: "AbortError" })),
      configurable: true,
    });
    // Dismissing the sheet is a normal outcome, not a failure to report.
    await expect(share({ title: "x" })).resolves.toBe(false);
    delete (navigator as any).share;
  });
});

describe("selection and highlights", () => {
  it("reads an empty selection safely", () => {
    const info = readSelection(document.body);
    expect(info.text).toBe("");
    expect(info.within).toBe(false);
  });

  it("findRanges locates every occurrence", () => {
    const host = document.createElement("div");
    host.textContent = "the cat sat on the mat";
    document.body.appendChild(host);

    expect(findRanges(host, "at")).toHaveLength(3); // cat, sat, mat
    expect(findRanges(host, "THE")).toHaveLength(2); // case-insensitive
    expect(findRanges(host, "")).toHaveLength(0);
  });

  it("highlight is a no-op where CSS.highlights is missing", () => {
    expect(supportsHighlights()).toBe(false);
    const host = document.createElement("div");
    host.textContent = "abc";
    document.body.appendChild(host);
    const clear = highlight("s", findRanges(host, "b"));
    expect(() => clear()).not.toThrow();
  });

  it("registers and removes a highlight where supported", () => {
    const highlights = new Map<string, unknown>();
    (globalThis as any).CSS = { highlights };
    (globalThis as any).Highlight = class { constructor(...r: Range[]) { void r; } };

    const host = document.createElement("div");
    host.textContent = "find me";
    document.body.appendChild(host);

    const clear = highlight("search", findRanges(host, "me"));
    expect(highlights.has("search")).toBe(true);
    clear();
    expect(highlights.has("search")).toBe(false);

    delete (globalThis as any).CSS;
    delete (globalThis as any).Highlight;
  });
});

describe("typed streams", () => {
  class FakeES2 {
    static last: FakeES2 | null = null;
    onmessage: ((e: any) => void) | null = null;
    onopen: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    readyState = 1;
    constructor(public url: string) { FakeES2.last = this; }
    close() {}
  }

  interface Price { amount: number; sym: string }

  it("parses JSON and hands over a typed payload", async () => {
    (globalThis as any).EventSource = FakeES2;
    const seen: Price[] = [];
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @sse<Price>("/prices", { json: true })
      onTick(e: MessageEvent<Price>) {
        // `amount` only typechecks because the parameter really is Price.
        seen.push({ amount: e.data.amount, sym: e.data.sym });
      }
    }
    await mount(El, t + "-x");

    FakeES2.last!.onmessage?.({ type: "message", data: '{"amount":42,"sym":"LOOM"}' });
    expect(seen).toEqual([{ amount: 42, sym: "LOOM" }]);

    delete (globalThis as any).EventSource;
  });

  it("routes a malformed payload to onError instead of the handler", async () => {
    (globalThis as any).EventSource = FakeES2;
    const seen: unknown[] = [];
    const errors: unknown[] = [];
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @sse<Price>("/prices", { json: true, onError: (e) => errors.push(e) })
      onTick(e: MessageEvent<Price>) { seen.push(e.data); }
    }
    await mount(El, t + "-x");

    FakeES2.last!.onmessage?.({ type: "message", data: "{not json" });

    // One bad frame must not reach the handler or take the component down.
    expect(seen).toEqual([]);
    expect(errors).toHaveLength(1);

    delete (globalThis as any).EventSource;
  });

  it("leaves data alone without json", async () => {
    (globalThis as any).EventSource = FakeES2;
    const seen: string[] = [];
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @sse("/raw")
      onTick(e: MessageEvent<string>) { seen.push(e.data); }
    }
    await mount(El, t + "-x");

    FakeES2.last!.onmessage?.({ type: "message", data: "plain" });
    expect(seen).toEqual(["plain"]);

    delete (globalThis as any).EventSource;
  });
});
