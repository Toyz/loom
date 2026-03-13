/**
 * Tests: EventBus enhancements — once, waitFor, cancel, inheritance, @on.once
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { LoomEvent } from "../src/event";
import { EventBus, bus } from "../src/bus";
import { on } from "../src/decorators/events";
import { fixture, cleanup } from "../src/testing";

// ── Test events ──

class Ping extends LoomEvent {
  constructor(public message: string) { super(); }
}

class UIEvent extends LoomEvent {
  constructor(public source: string) { super(); }
}

class ClickEvent extends UIEvent {
  constructor(source: string, public x: number, public y: number) {
    super(source);
  }
}

class DeepClick extends ClickEvent {
  constructor(source: string, x: number, y: number, public button: string) {
    super(source, x, y);
  }
}

let tagCounter = 0;
function nextTag() { return `test-bus-enh-${++tagCounter}`; }

beforeEach(() => bus.reset());
afterEach(() => cleanup());

// ═══════════════════════════════════════════════════════════════
// bus.once()
// ═══════════════════════════════════════════════════════════════

describe("bus.once()", () => {
  it("fires handler exactly once", () => {
    const fn = vi.fn();
    bus.once(Ping, fn);

    bus.emit(new Ping("first"));
    bus.emit(new Ping("second"));
    bus.emit(new Ping("third"));

    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0].message).toBe("first");
  });

  it("returns unsub that cancels before fire", () => {
    const fn = vi.fn();
    const unsub = bus.once(Ping, fn);

    unsub(); // cancel before any emit

    bus.emit(new Ping("too late"));
    expect(fn).not.toHaveBeenCalled();
  });

  it("does not affect other listeners", () => {
    const onceFn = vi.fn();
    const alwaysFn = vi.fn();

    bus.once(Ping, onceFn);
    bus.on(Ping, alwaysFn);

    bus.emit(new Ping("1"));
    bus.emit(new Ping("2"));

    expect(onceFn).toHaveBeenCalledOnce();
    expect(alwaysFn).toHaveBeenCalledTimes(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// bus.waitFor()
// ═══════════════════════════════════════════════════════════════

describe("bus.waitFor()", () => {
  it("resolves on next emit", async () => {
    const p = bus.waitFor(Ping);

    // Emit after a microtask
    queueMicrotask(() => bus.emit(new Ping("hello")));

    const event = await p;
    expect(event).toBeInstanceOf(Ping);
    expect(event.message).toBe("hello");
  });

  it("resolves only once", async () => {
    const fn = vi.fn();
    bus.waitFor(Ping).then(fn);

    bus.emit(new Ping("1"));
    bus.emit(new Ping("2"));

    await new Promise<void>(r => queueMicrotask(() => r()));

    expect(fn).toHaveBeenCalledOnce();
  });

  it("rejects on timeout", async () => {
    const p = bus.waitFor(Ping, { timeout: 50 });

    await expect(p).rejects.toThrow(/timed out/);
  });

  it("clears timeout on successful resolve", async () => {
    const p = bus.waitFor(Ping, { timeout: 5000 });

    bus.emit(new Ping("fast"));

    const event = await p;
    expect(event.message).toBe("fast");
    // If timer wasn't cleared, the test would hang or reject — it doesn't.
  });
});

// ═══════════════════════════════════════════════════════════════
// event.cancel()
// ═══════════════════════════════════════════════════════════════

describe("event.cancel()", () => {
  it("stops subsequent handlers", () => {
    const first = vi.fn((e: Ping) => e.cancel());
    const second = vi.fn();

    bus.on(Ping, first);
    bus.on(Ping, second);

    bus.emit(new Ping("stop"));

    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });

  it("sets cancelled flag", () => {
    const event = new Ping("test");
    expect(event.cancelled).toBe(false);

    event.cancel();
    expect(event.cancelled).toBe(true);
  });

  it("stops parent propagation on inheritance", () => {
    const clickFn = vi.fn((e: ClickEvent) => e.cancel());
    const uiFn = vi.fn();

    bus.on(ClickEvent, clickFn);
    bus.on(UIEvent, uiFn);

    bus.emit(new ClickEvent("mouse", 10, 20));

    expect(clickFn).toHaveBeenCalledOnce();
    expect(uiFn).not.toHaveBeenCalled(); // cancelled before parent walk
  });
});

// ═══════════════════════════════════════════════════════════════
// Event inheritance
// ═══════════════════════════════════════════════════════════════

describe("event inheritance", () => {
  it("child events fire parent handlers", () => {
    const uiFn = vi.fn();
    bus.on(UIEvent, uiFn);

    bus.emit(new ClickEvent("mouse", 5, 10));

    expect(uiFn).toHaveBeenCalledOnce();
    expect(uiFn.mock.calls[0][0]).toBeInstanceOf(ClickEvent);
  });

  it("3-level chain: DeepClick → ClickEvent → UIEvent", () => {
    const uiFn = vi.fn();
    const clickFn = vi.fn();
    const deepFn = vi.fn();

    bus.on(UIEvent, uiFn);
    bus.on(ClickEvent, clickFn);
    bus.on(DeepClick, deepFn);

    bus.emit(new DeepClick("touch", 1, 2, "left"));

    expect(deepFn).toHaveBeenCalledOnce();
    expect(clickFn).toHaveBeenCalledOnce();
    expect(uiFn).toHaveBeenCalledOnce();
  });

  it("parent event does NOT fire child handlers", () => {
    const clickFn = vi.fn();
    bus.on(ClickEvent, clickFn);

    bus.emit(new UIEvent("keyboard"));

    expect(clickFn).not.toHaveBeenCalled();
  });

  it("cancel in child stops parent walk", () => {
    const clickFn = vi.fn((e: ClickEvent) => e.cancel());
    const uiFn = vi.fn();

    bus.on(ClickEvent, clickFn);
    bus.on(UIEvent, uiFn);

    bus.emit(new ClickEvent("mouse", 0, 0));

    expect(clickFn).toHaveBeenCalledOnce();
    expect(uiFn).not.toHaveBeenCalled();
  });

  it("works with once() and inheritance", () => {
    const uiFn = vi.fn();
    bus.once(UIEvent, uiFn);

    bus.emit(new ClickEvent("mouse", 1, 1));
    bus.emit(new ClickEvent("mouse", 2, 2));

    expect(uiFn).toHaveBeenCalledOnce(); // once() still works
  });
});

// ═══════════════════════════════════════════════════════════════
// @on.once decorator
// ═══════════════════════════════════════════════════════════════

describe("@on.once decorator", () => {
  it("fires once on connected element", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @on.once(Ping)
      onPing(e: Ping) { fn(e.message); }
    }

    customElements.define(tag, El);
    await fixture<El>(tag);

    bus.emit(new Ping("first"));
    bus.emit(new Ping("second"));

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("first");
  });

  it("cleans up on disconnect even if never fired", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @on.once(Ping)
      onPing(e: Ping) { fn(e.message); }
    }

    customElements.define(tag, El);
    await fixture<El>(tag);
    cleanup(); // disconnect before any fire

    bus.emit(new Ping("after disconnect"));
    expect(fn).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════════

describe("eventbus edge cases", () => {
  it("once + cancel combo", () => {
    const onceFn = vi.fn((e: Ping) => e.cancel());
    const afterFn = vi.fn();

    bus.once(Ping, onceFn);
    bus.on(Ping, afterFn);

    bus.emit(new Ping("stop"));

    expect(onceFn).toHaveBeenCalledOnce();
    expect(afterFn).not.toHaveBeenCalled();
  });

  it("waitFor with immediate emit resolves correctly", async () => {
    // Emit before await — should still resolve
    const p = bus.waitFor(Ping);
    bus.emit(new Ping("immediate"));

    const event = await p;
    expect(event.message).toBe("immediate");
  });

  it("fresh bus has no leaks from once()", () => {
    const testBus = new EventBus();
    const fn = vi.fn();

    testBus.once(Ping, fn);
    testBus.emit(new Ping("x"));

    // After once fires, no handlers should remain
    testBus.emit(new Ping("y"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancel does not affect unrelated event types", () => {
    const pingFn = vi.fn((e: Ping) => e.cancel());
    const uiFn = vi.fn();

    bus.on(Ping, pingFn);
    bus.on(UIEvent, uiFn);

    bus.emit(new Ping("stop"));
    bus.emit(new UIEvent("keyboard"));

    expect(pingFn).toHaveBeenCalledOnce();
    expect(uiFn).toHaveBeenCalledOnce(); // unrelated event still fires
  });
});
