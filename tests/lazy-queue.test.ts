/**
 * Tests: @lazy — auto-queued method calls
 *
 * Verifies that method calls made BEFORE the impl loads are
 * transparently queued and replayed after mount.
 *
 * Edge cases:
 *  - Single queued call returns a Promise that resolves to the real value
 *  - Multiple queued calls replayed in order
 *  - Arguments preserved through the queue
 *  - Queued calls see correct `this` on impl
 *  - Known shell properties are NOT intercepted by the queue proxy
 *  - After mount, calls are direct (no async wrapping)
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-laq-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@lazy auto-queued method calls", () => {
  it("queued call returns a Promise that resolves to the real return value", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });

    class Real extends LoomElement {
      greet() { return "hello"; }
    }

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // Call before load — should return a Promise
    const result = el.greet();
    expect(result).toBeInstanceOf(Promise);

    // Now resolve the load
    loadResolve!(undefined);

    // The queued call should resolve to the real return value
    expect(await result).toBe("hello");

    el.remove();
  });

  it("queued calls replay in order", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });
    const callOrder: string[] = [];

    class Real extends LoomElement {
      first()  { callOrder.push("first"); }
      second() { callOrder.push("second"); }
      third()  { callOrder.push("third"); }
    }

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // Queue three calls before load
    el.first();
    el.second();
    el.third();

    // Resolve load
    loadResolve!(undefined);
    await el.ready;

    expect(callOrder).toEqual(["first", "second", "third"]);

    el.remove();
  });

  it("arguments are preserved through the queue", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });

    class Real extends LoomElement {
      add(a: number, b: number) { return a + b; }
    }

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const result = el.add(10, 32);
    loadResolve!(undefined);

    expect(await result).toBe(42);

    el.remove();
  });

  it("known shell properties are NOT intercepted by the queue proxy", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });

    class Real extends LoomElement {}

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // These should all work normally — not intercepted
    expect(el.tagName).toBeTruthy();
    expect(el.ready).toBeInstanceOf(Promise);
    expect(typeof el.setAttribute).toBe("function");

    loadResolve!(undefined);
    await el.ready;

    el.remove();
  });

  it("after mount, direct calls work without Promise wrapping", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      ping() { return "pong"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await el.ready;

    // After mount, the proxy is gone — direct forwarding stub
    const result = el.ping();
    // Should return the value directly, not a Promise
    expect(result).toBe("pong");

    el.remove();
  });

  it("accessing 'then' does NOT make element thenable", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });

    class Real extends LoomElement {}

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // el.then should be undefined — NOT a queuing function
    // If this were truthy, Promise.resolve(el) would treat el as a thenable
    expect(el.then).toBeUndefined();

    loadResolve!(undefined);
    await el.ready;
    el.remove();
  });

  it("underscore-prefixed properties return undefined, not queuing function", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });

    class Real extends LoomElement {}

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // Internal-looking properties should NOT be intercepted
    expect(el.__lazyStyles).toBeUndefined();
    expect(el._internal).toBeUndefined();

    loadResolve!(undefined);
    await el.ready;
    el.remove();
  });

  it("proxy is removed on load error — no zombie queuing", async () => {
    const tag = nextTag();
    const consoleError = (await import("vitest")).vi.spyOn(console, "error").mockImplementation(() => {});

    @component(tag)
    @lazy(() => Promise.reject(new Error("fail")))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    // After error, accessing unknown props should return undefined (no proxy)
    expect(el.nonExistent).toBeUndefined();

    consoleError.mockRestore();
    el.remove();
  });

  it("@prop values on impl are NOT contaminated by proxy", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });

    class Real extends LoomElement {
      // Simulate @prop — accessor with default value
      heading = "default-heading";
    }

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    loadResolve!(undefined);
    await el.ready;

    // impl's heading should be the default string, not a Promise or function
    const implTag = `${tag}-impl`;
    const impl = el.shadowRoot?.querySelector(implTag);
    expect(impl).toBeTruthy();
    expect(impl.heading).toBe("default-heading");

    el.remove();
  });

  it("void methods can be queued without error", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });
    let called = false;

    class Real extends LoomElement {
      doSomething() { called = true; }
    }

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const result = el.doSomething();
    expect(result).toBeInstanceOf(Promise);

    loadResolve!(undefined);

    // Queued void call resolves to undefined
    expect(await result).toBeUndefined();
    expect(called).toBe(true);

    el.remove();
  });

  it("multiple queued calls to the same method all execute", async () => {
    const tag = nextTag();
    let loadResolve: (v: any) => void;
    const loadPromise = new Promise(r => { loadResolve = r; });
    let count = 0;

    class Real extends LoomElement {
      increment() { return ++count; }
    }

    @component(tag)
    @lazy(() => loadPromise.then(() => ({ default: Real })))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const r1 = el.increment();
    const r2 = el.increment();
    const r3 = el.increment();

    loadResolve!(undefined);

    expect(await r1).toBe(1);
    expect(await r2).toBe(2);
    expect(await r3).toBe(3);

    el.remove();
  });
});
