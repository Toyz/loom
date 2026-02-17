/**
 * Tests: @interval, @timeout, @debounce, @throttle (TC39 Stage 3)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { interval, timeout, debounce, throttle } from "../src/element/timing";
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
