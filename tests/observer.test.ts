/**
 * Tests: @observer decorator (TC39 Stage 3)
 *
 * Covers:
 *  - ResizeObserver: creates observer on connect, disconnects on unmount
 *  - IntersectionObserver: creates with options, observes element
 *  - MutationObserver: creates with options, observes element
 *  - Cleanup on disconnectedCallback
 *  - Multiple observers on one class
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { observer } from "../src/element/observers";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-obs-${++tagCounter}`; }

// ── Mock observers for JSDOM ──

let mockResizeObserverInstances: any[] = [];
let mockIntersectionObserverInstances: any[] = [];
let mockMutationObserverInstances: any[] = [];

class MockResizeObserver {
  callback: any;
  observed: any[] = [];
  constructor(callback: any) {
    this.callback = callback;
    mockResizeObserverInstances.push(this);
  }
  observe(el: any, opts?: any) { this.observed.push({ el, opts }); }
  unobserve() {}
  disconnect() { this.observed = []; }
}

class MockIntersectionObserver {
  callback: any;
  observed: any[] = [];
  options: any;
  constructor(callback: any, options?: any) {
    this.callback = callback;
    this.options = options;
    mockIntersectionObserverInstances.push(this);
  }
  observe(el: any) { this.observed.push(el); }
  unobserve() {}
  disconnect() { this.observed = []; }
}

class MockMutationObserver {
  callback: any;
  observed: any[] = [];
  constructor(callback: any) {
    this.callback = callback;
    mockMutationObserverInstances.push(this);
  }
  observe(el: any, options: any) { this.observed.push({ el, options }); }
  disconnect() { this.observed = []; }
  takeRecords() { return []; }
}

beforeEach(() => {
  mockResizeObserverInstances = [];
  mockIntersectionObserverInstances = [];
  mockMutationObserverInstances = [];

  (globalThis as any).ResizeObserver = MockResizeObserver;
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  (globalThis as any).MutationObserver = MockMutationObserver;
});

afterEach(() => cleanup());

describe("@observer('resize')", () => {
  it("creates ResizeObserver on connect and observes the element", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("resize")
      onResize(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(mockResizeObserverInstances.length).toBe(1);
    const ro = mockResizeObserverInstances[0];
    expect(ro.observed.length).toBe(1);
    expect(ro.observed[0].el).toBe(el);
  });

  it("calls the decorated method with each entry", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("resize")
      onResize(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const ro = mockResizeObserverInstances[0];

    // Simulate a resize callback
    const fakeEntry = { contentRect: { width: 100, height: 200 } };
    ro.callback([fakeEntry]);
    expect(fn).toHaveBeenCalledWith(fakeEntry);
  });

  it("disconnects observer on element removal", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("resize")
      onResize(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const ro = mockResizeObserverInstances[0];
    expect(ro.observed.length).toBe(1);

    cleanup(); // triggers disconnectedCallback
    expect(ro.observed.length).toBe(0); // disconnect() was called
  });

  it("passes options to ResizeObserver.observe()", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("resize", { box: "border-box" } as any)
      onResize(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const ro = mockResizeObserverInstances[0];
    expect(ro.observed[0].opts).toEqual({ box: "border-box" });
  });
});

describe("@observer('intersection')", () => {
  it("creates IntersectionObserver on connect with options", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("intersection", { threshold: 0.5, rootMargin: "100px" })
      onVisible(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(mockIntersectionObserverInstances.length).toBe(1);
    const io = mockIntersectionObserverInstances[0];
    expect(io.observed).toContain(el);
    expect(io.options.threshold).toBe(0.5);
    expect(io.options.rootMargin).toBe("100px");
  });

  it("calls the decorated method per entry", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("intersection", { threshold: 0 })
      onVisible(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const io = mockIntersectionObserverInstances[0];

    const fakeEntry = { isIntersecting: true, intersectionRatio: 1 };
    io.callback([fakeEntry]);
    expect(fn).toHaveBeenCalledWith(fakeEntry);
  });

  it("disconnects on element removal", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("intersection", { threshold: 0 })
      onVisible(entry: any) { fn(entry); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const io = mockIntersectionObserverInstances[0];
    expect(io.observed.length).toBe(1);

    cleanup();
    expect(io.observed.length).toBe(0);
  });
});

describe("@observer('mutation')", () => {
  it("creates MutationObserver on connect with options", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("mutation", { childList: true, subtree: true })
      onChange(record: any) { fn(record); }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(mockMutationObserverInstances.length).toBe(1);
    const mo = mockMutationObserverInstances[0];
    expect(mo.observed.length).toBe(1);
    expect(mo.observed[0].el).toBe(el);
    expect(mo.observed[0].options).toEqual({ childList: true, subtree: true });
  });

  it("calls the decorated method per record", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("mutation", { childList: true })
      onChange(record: any) { fn(record); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const mo = mockMutationObserverInstances[0];

    const fakeRecord = { type: "childList", addedNodes: [], removedNodes: [] };
    mo.callback([fakeRecord]);
    expect(fn).toHaveBeenCalledWith(fakeRecord);
  });

  it("disconnects on element removal", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("mutation", { childList: true })
      onChange(record: any) { fn(record); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    const mo = mockMutationObserverInstances[0];
    expect(mo.observed.length).toBe(1);

    cleanup();
    expect(mo.observed.length).toBe(0);
  });
});

describe("multiple @observer decorators", () => {
  it("supports multiple observers on the same class", async () => {
    const resizeFn = vi.fn();
    const mutFn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @observer("resize")
      onResize(entry: any) { resizeFn(entry); }

      @observer("mutation", { childList: true })
      onChange(record: any) { mutFn(record); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);

    expect(mockResizeObserverInstances.length).toBe(1);
    expect(mockMutationObserverInstances.length).toBe(1);

    // Simulate callbacks
    mockResizeObserverInstances[0].callback([{ contentRect: { width: 50 } }]);
    mockMutationObserverInstances[0].callback([{ type: "childList" }]);

    expect(resizeFn).toHaveBeenCalledOnce();
    expect(mutFn).toHaveBeenCalledOnce();
  });

  it("disconnects all observers on element removal", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @observer("resize")
      onResize(_entry: any) {}

      @observer("mutation", { childList: true })
      onChange(_record: any) {}
    }
    customElements.define(tag, El);

    await fixture<El>(tag);

    const ro = mockResizeObserverInstances[0];
    const mo = mockMutationObserverInstances[0];
    expect(ro.observed.length).toBe(1);
    expect(mo.observed.length).toBe(1);

    cleanup();
    expect(ro.observed.length).toBe(0);
    expect(mo.observed.length).toBe(0);
  });
});
