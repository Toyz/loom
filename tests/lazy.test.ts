/**
 * Tests: @lazy decorator — deferred module loading
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@lazy", () => {
  it("defers connectedCallback until module loads", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    // The "real" class loaded lazily
    class RealComponent extends LoomElement {
      connectedCallback() {
        super.connectedCallback();
        fn();
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    await fixture(tag);

    // Wait for the async load to complete
    await new Promise(r => setTimeout(r, 0));

    // The real component's methods should have been copied to the stub
    expect(fn).toHaveBeenCalled();
  });

  it("copies prototype methods from loaded class onto stub", async () => {
    const tag = nextTag();

    class RealComponent extends LoomElement {
      greet() { return "hello from real"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    const el = await fixture<any>(tag);

    // Wait for lazy load
    await new Promise(r => setTimeout(r, 0));

    expect(typeof el.greet).toBe("function");
    expect(el.greet()).toBe("hello from real");
  });

  it("handles load failure gracefully", async () => {
    const tag = nextTag();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    @component(tag)
    @lazy(() => Promise.reject(new Error("network error")))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    const el = await fixture(tag);

    // Wait for the async load to fail
    await new Promise(r => setTimeout(r, 0));

    // Should show error in shadow DOM
    expect(el.shadowRoot!.innerHTML).toContain("Failed to load component");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("skips reload on second mount (LAZY_LOADED flag)", async () => {
    const loadCount = vi.fn();
    const tag = nextTag();

    class RealComponent extends LoomElement {
      sayHi() { return "hi"; }
    }

    const loader = () => {
      loadCount();
      return Promise.resolve({ default: RealComponent });
    };

    @component(tag)
    @lazy(loader)
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);

    // First mount
    await fixture(tag);
    await new Promise(r => setTimeout(r, 0));
    expect(loadCount).toHaveBeenCalledTimes(1);

    // Cleanup and re-mount
    cleanup();
    await fixture(tag);
    await new Promise(r => setTimeout(r, 0));

    // Loader should NOT be called again
    expect(loadCount).toHaveBeenCalledTimes(1);
  });

  it("shows loading element when opts.loading is set", async () => {
    const tag = nextTag();
    const loadingTag = `${tag}-loading`;

    // Define a simple loading indicator
    class LoadingEl extends HTMLElement {
      connectedCallback() {
        this.textContent = "Loading...";
      }
    }
    if (!customElements.get(loadingTag)) {
      customElements.define(loadingTag, LoadingEl);
    }

    // Create a loader that we can control
    let resolveLoader!: (v: any) => void;
    const loaderPromise = new Promise(r => { resolveLoader = r; });

    class RealComponent extends LoomElement {}

    @component(tag)
    @lazy(() => loaderPromise, { loading: loadingTag })
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    const el = await fixture(tag);

    // While loading, the loading element should be in the shadow DOM
    await new Promise(r => setTimeout(r, 0));
    const loadingEl = el.shadowRoot!.querySelector(loadingTag);
    expect(loadingEl).toBeTruthy();

    // Resolve the loader
    resolveLoader({ default: RealComponent });
    await new Promise(r => setTimeout(r, 10));
  });
});
