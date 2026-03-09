/**
 * Tests: @lazy — .ready promise
 *
 * Edge cases:
 *  - .ready resolves after impl mounts
 *  - .ready resolves with the shell element
 *  - Methods callable after await .ready
 *  - .ready resolves immediately on cached re-mount
 *  - .ready rejects on load failure
 *  - Multiple instances each get independent .ready
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lrp-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@lazy .ready promise", () => {
  it("resolves after impl is mounted", async () => {
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

    // .ready should be a promise
    expect(el.ready).toBeInstanceOf(Promise);

    const resolved = await el.ready;
    expect(resolved).toBe(el);

    el.remove();
  });

  it("methods are callable after await .ready", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      greet(name: string) { return `hello ${name}`; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    await el.ready;
    expect(el.greet("world")).toBe("hello world");

    el.remove();
  });

  it("resolves immediately on cached re-mount", async () => {
    const tag = nextTag();

    class Real extends LoomElement {}

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    // First mount — triggers load
    const el1 = document.createElement(tag) as any;
    document.body.appendChild(el1);
    await el1.ready;
    el1.remove();

    // Second mount — module cached, should resolve nearly instantly
    const el2 = document.createElement(tag) as any;
    document.body.appendChild(el2);

    const t0 = performance.now();
    await el2.ready;
    const elapsed = performance.now() - t0;

    // Cached path should be sub-millisecond (no async load)
    expect(elapsed).toBeLessThan(10);

    el2.remove();
  });

  it("rejects on load failure", async () => {
    const tag = nextTag();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    @component(tag)
    @lazy(() => Promise.reject(new Error("network error")))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    await expect(el.ready).rejects.toThrow("network error");

    consoleError.mockRestore();
    el.remove();
  });

  it("each instance gets its own independent .ready", async () => {
    const tag = nextTag();

    class Real extends LoomElement {}

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el1 = document.createElement(tag) as any;
    const el2 = document.createElement(tag) as any;
    document.body.appendChild(el1);
    document.body.appendChild(el2);

    // Each has its own promise
    expect(el1.ready).not.toBe(el2.ready);

    const [r1, r2] = await Promise.all([el1.ready, el2.ready]);
    expect(r1).toBe(el1);
    expect(r2).toBe(el2);

    el1.remove();
    el2.remove();
  });
});
