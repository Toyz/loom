/**
 * Tests: @lazy decorator — deferred module loading
 *
 * Tests the shadow-DOM hosting approach where the shell element creates
 * a real instance inside its shadow DOM (instead of prototype-copying,
 * which breaks TC39 private fields).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy, LAZY_LOADED } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { reactive } from "../src/store/decorators";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@lazy", () => {
  it("mounts real component inside shell shadow DOM", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealComponent extends LoomElement {
      update() { return document.createElement("p"); }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    const el = await fixture(tag);

    // Wait for async load
    await new Promise(r => setTimeout(r, 10));

    // The real component should be hosted inside the shell's shadow DOM
    const impl = el.shadowRoot!.querySelector(implTag);
    expect(impl).toBeTruthy();
    expect(impl).toBeInstanceOf(RealComponent);
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
    await new Promise(r => setTimeout(r, 10));

    // Should show error in shadow DOM
    expect(el.shadowRoot!.innerHTML).toContain("Failed to load component");
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("skips reload on second mount (LAZY_LOADED flag)", async () => {
    const loadCount = vi.fn();
    const tag = nextTag();

    class RealComponent extends LoomElement {}

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
    await new Promise(r => setTimeout(r, 10));
    expect(loadCount).toHaveBeenCalledTimes(1);

    // Cleanup and re-mount
    cleanup();
    await fixture(tag);
    await new Promise(r => setTimeout(r, 10));

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
    await new Promise(r => setTimeout(r, 10));
    const loadingEl = el.shadowRoot!.querySelector(loadingTag);
    expect(loadingEl).toBeTruthy();

    // Resolve the loader
    resolveLoader({ default: RealComponent });
    await new Promise(r => setTimeout(r, 10));
  });

  it("forwards attributes from shell to real instance", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealComponent extends LoomElement {}

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);

    // Create element and set attributes BEFORE connecting to DOM
    const el = document.createElement(tag);
    el.setAttribute("data-id", "42");
    el.setAttribute("slug", "test-slug");
    document.body.appendChild(el);

    await new Promise(r => setTimeout(r, 10));

    const impl = el.shadowRoot!.querySelector(implTag);
    expect(impl).toBeTruthy();
    expect(impl!.getAttribute("data-id")).toBe("42");
    expect(impl!.getAttribute("slug")).toBe("test-slug");

    // Cleanup
    el.remove();
  });

  // ── REGRESSION: TC39 private fields ──

  it("REGRESSION: real instance has correct class identity for private fields", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    // The real class uses TC39 accessor (which creates #private_accessor_storage)
    class RealComponent extends LoomElement {
      @reactive accessor count = 0;

      update() {
        const p = document.createElement("p");
        p.textContent = `count: ${this.count}`;
        return p;
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    const el = await fixture(tag);

    await new Promise(r => setTimeout(r, 10));

    // The impl should be a REAL RealComponent instance with private slots
    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();
    expect(impl).toBeInstanceOf(RealComponent);

    // Accessing @reactive accessor should NOT throw (private field exists)
    expect(() => impl.count).not.toThrow();
    expect(impl.count).toBe(0);

    // Setting it should also work (setter uses private field)
    expect(() => { impl.count = 5; }).not.toThrow();
    expect(impl.count).toBe(5);
  });

  // ── REGRESSION: attribute→property bridge ──

  it("REGRESSION: attributes are also set as properties on impl for @prop bindings", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealComponent extends LoomElement {
      // Simulates @prop — a property accessor that lives on the prototype
      _slug = "";
      get slug() { return this._slug; }
      set slug(v: string) { this._slug = v; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);

    // Outlet sets slug as an attribute (backward compat)
    const el = document.createElement(tag);
    el.setAttribute("slug", "khaati");
    document.body.appendChild(el);

    await new Promise(r => setTimeout(r, 10));

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    // The attribute should be set
    expect(impl.getAttribute("slug")).toBe("khaati");

    // AND the property should also be set (attribute→property bridge)
    // This is critical: @prop accessors react to property sets, not setAttribute
    expect(impl.slug).toBe("khaati");

    el.remove();
  });
});
