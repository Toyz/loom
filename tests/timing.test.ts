/**
 * Tests: @interval, @timeout, @debounce, @throttle
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { interval, timeout, debounce, throttle } from "../src/element/timing";

let tagCounter = 0;
function nextTag() { return `test-timing-${++tagCounter}`; }

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("@interval", () => {
  it("calls method repeatedly at the given interval", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      tick() { fn(); }
    }
    interval(100)(El.prototype, "tick");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    vi.advanceTimersByTime(350);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      tick() { fn(); }
    }
    interval(100)(El.prototype, "tick");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);

    document.body.removeChild(el);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1); // no more calls
  });
});

describe("@timeout", () => {
  it("calls method once after delay", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      delayed() { fn(); }
    }
    timeout(200)(El.prototype, "delayed");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancels on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      delayed() { fn(); }
    }
    timeout(200)(El.prototype, "delayed");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    document.body.removeChild(el);

    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("@debounce", () => {
  it("delays execution until idle period", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      handler() { fn(); }
    }
    debounce(100)(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.handler();
    el.handler();
    el.handler();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("restarts timer on each call", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      handler() { fn(); }
    }
    debounce(100)(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.handler();
    vi.advanceTimersByTime(50);
    el.handler(); // restart
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancels on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      handler() { fn(); }
    }
    debounce(100)(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.handler();
    document.body.removeChild(el);

    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("@throttle", () => {
  it("fires immediately on first call", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      handler() { fn(); }
    }
    throttle(100)(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.handler();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("throttles subsequent calls within window", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      handler() { fn(); }
    }
    throttle(100)(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.handler(); // fires
    el.handler(); // queued
    el.handler(); // re-queued (replaces previous)
    expect(fn).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2); // trailing fires
  });

  it("cancels trailing on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      handler() { fn(); }
    }
    throttle(100)(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.handler(); // fires
    el.handler(); // queued
    document.body.removeChild(el);

    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1); // trailing was cancelled
  });
});
