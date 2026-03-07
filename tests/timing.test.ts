/**
 * Tests: @interval, @timeout, @debounce, @throttle (TC39 Stage 3)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { interval, timeout, debounce, throttle, animationFrame } from "../src/element/timing";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-timing-${++tagCounter}`; }

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("@interval", () => {
  it("calls method repeatedly at the given interval", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @interval(100)
      tick() { fn(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);

    vi.advanceTimersByTime(350);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @interval(100)
      tick() { fn(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);

    cleanup(); // triggers disconnectedCallback, should clear interval
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1); // no more calls
  });

  it("reconnect restarts interval", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @interval(100)
      tick() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);

    // Disconnect
    el.remove();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1); // no more

    // Reconnect
    document.body.appendChild(el);
    vi.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(3); // 2 more ticks
    el.remove();
  });
});

describe("@timeout", () => {
  it("calls method once after delay", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @timeout(200)
      delayed() { fn(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancels on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @timeout(200)
      delayed() { fn(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    cleanup(); // disconnect before timeout fires

    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("@debounce", () => {
  it("delays execution until idle period", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @debounce(100)
      handler() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    el.handler();
    el.handler();
    el.handler();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("restarts timer on each call", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @debounce(100)
      handler() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    el.handler();
    vi.advanceTimersByTime(50);
    el.handler(); // restart
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancels on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @debounce(100)
      handler() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.handler();
    cleanup(); // disconnect cancels pending debounce

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("@throttle", () => {
  it("fires immediately on first call", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @throttle(100)
      handler() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    el.handler();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("throttles subsequent calls within window", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @throttle(100)
      handler() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    el.handler(); // fires
    el.handler(); // queued
    el.handler(); // re-queued (replaces previous)
    expect(fn).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2); // trailing fires
  });

  it("cancels trailing on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @throttle(100)
      handler() { fn(); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.handler(); // fires
    el.handler(); // queued
    cleanup(); // disconnect cancels trailing

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1); // trailing was cancelled
  });
});

// ── @animationFrame ──

import { renderLoop } from "../src/render-loop";

describe("@animationFrame", () => {
  let origRAF: typeof requestAnimationFrame;
  let origCAF: typeof cancelAnimationFrame;
  let pendingCb: ((t: number) => void) | null = null;

  beforeEach(() => {
    // Undo file-level fake timers FIRST — they override requestAnimationFrame
    vi.useRealTimers();
    // Stop render loop to reset running flag from prior tests
    renderLoop.stop();
    // Save originals AFTER restoring real timers
    origRAF = globalThis.requestAnimationFrame;
    origCAF = globalThis.cancelAnimationFrame;
    pendingCb = null;
    // Install our mock rAF — captures the callback for manual driving
    (globalThis as any).requestAnimationFrame = (cb: (t: number) => void) => {
      pendingCb = cb;
      return 1;
    };
    (globalThis as any).cancelAnimationFrame = () => { pendingCb = null; };
  });

  afterEach(() => {
    renderLoop.stop();
    cleanup();
    globalThis.requestAnimationFrame = origRAF;
    globalThis.cancelAnimationFrame = origCAF;
  });

  /** Simulate N frames at ~60fps by driving the pending rAF callback */
  function tickFrames(n: number, startTime = 0) {
    for (let i = 0; i < n; i++) {
      const t = startTime + (i + 1) * 16.667;
      if (pendingCb) {
        const cb = pendingCb;
        pendingCb = null;
        cb(t);
      }
    }
  }

  it("uncapped @animationFrame fires every frame", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @animationFrame
      tick(dt: number) { fn(dt); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    renderLoop.start();

    // Tick 10 frames — first frame has dt=0, method fires on each
    tickFrames(12);

    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(8);
  });

  it("@animationFrame({ fps: 30 }) fires ~half the frames", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @animationFrame({ fps: 30 })
      tick(dt: number) { fn(dt); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    renderLoop.start();

    // Tick 60 frames (~1 second at 60fps)
    tickFrames(62);

    // At 30fps we expect ~30 calls (±2 for frame boundary timing)
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(28);
    expect(fn.mock.calls.length).toBeLessThanOrEqual(32);
  });

  it("@animationFrame({ fps: 1 }) fires ~once per second", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @animationFrame({ fps: 1 })
      tick(dt: number) { fn(dt); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    renderLoop.start();

    // Tick 60 frames (~1 second at 60fps)
    tickFrames(62);

    // At 1fps we expect exactly 1 call
    expect(fn.mock.calls.length).toBe(1);
  });

  it("@animationFrame({ fps: 30, layer: 5 }) respects both options", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @animationFrame({ fps: 30, layer: 5 })
      tick(dt: number) { fn(dt); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    renderLoop.start();
    tickFrames(62);

    // Should still be throttled to ~30fps
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(28);
    expect(fn.mock.calls.length).toBeLessThanOrEqual(32);
  });
});

