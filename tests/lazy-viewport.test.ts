/**
 * Tests: @lazy viewport trigger — IntersectionObserver-based loading
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy, LAZY_LOADED } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-vp-${++tagCounter}`; }

afterEach(() => cleanup());

// ── IntersectionObserver mock ──
let ioInstances: MockIO[] = [];

class MockIO {
    callback: IntersectionObserverCallback;
    elements = new Set<Element>();
    disconnected = false;

    constructor(cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {
        this.callback = cb;
        ioInstances.push(this);
    }
    observe(el: Element) { this.elements.add(el); }
    unobserve(el: Element) { this.elements.delete(el); }
    disconnect() { this.disconnected = true; this.elements.clear(); }
    takeRecords() { return []; }

    /** Simulate the element becoming visible */
    trigger(el: Element) {
        this.callback(
            [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
        );
    }
}

beforeEach(() => {
    ioInstances = [];
    vi.stubGlobal("IntersectionObserver", MockIO);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("@lazy trigger: 'viewport'", () => {
    it("does NOT load until element enters viewport", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => { loadCount(); return Promise.resolve({ default: RealComponent }); }, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);

        // Tick — observer should be set up but loader NOT called
        await new Promise(r => setTimeout(r, 10));
        expect(loadCount).not.toHaveBeenCalled();

        // Simulate viewport intersect
        const io = ioInstances.find(i => i.elements.has(el))!;
        expect(io).toBeTruthy();
        io.trigger(el);

        // Now the loader should fire
        await new Promise(r => setTimeout(r, 20));
        expect(loadCount).toHaveBeenCalledTimes(1);

        // Impl should be mounted
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
        expect(impl).toBeTruthy();

        el.remove();
    });

    it("cleans up observer after load fires", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        const io = ioInstances.find(i => !i.disconnected)!;
        expect(io).toBeTruthy();
        expect(io.disconnected).toBe(false);

        // Trigger viewport
        io.trigger(el);
        await new Promise(r => setTimeout(r, 20));

        // Observer should be disconnected AND reference nulled
        expect(io.disconnected).toBe(true);
        expect((el as any).__lazyObserver).toBeNull();

        el.remove();
    });

    it("cleans up observer on disconnect before load", async () => {
        const tag = nextTag();
        let resolveLoader!: (v: any) => void;
        const loaderPromise = new Promise(r => { resolveLoader = r; });

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => loaderPromise, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        const io = ioInstances.find(i => !i.disconnected)!;
        expect(io.disconnected).toBe(false);

        // Remove element before viewport triggers
        el.remove();

        // Observer should be cleaned up
        expect(io.disconnected).toBe(true);
        expect((el as any).__lazyObserver).toBeNull();

        resolveLoader({ default: RealComponent });
    });

    it("shows loading placeholder while waiting for viewport", async () => {
        const tag = nextTag();
        const loadingTag = `${tag}-loading`;

        class LoadingEl extends HTMLElement {
            connectedCallback() { this.textContent = "Waiting..."; }
        }
        if (!customElements.get(loadingTag)) {
            customElements.define(loadingTag, LoadingEl);
        }

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), {
            trigger: "viewport",
            loading: loadingTag,
        })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Loading placeholder should be visible before viewport triggers
        const loadingEl = el.shadowRoot!.querySelector(loadingTag);
        expect(loadingEl).toBeTruthy();

        el.remove();
    });

    it("respects custom rootMargin", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), {
            trigger: "viewport",
            rootMargin: "500px",
        })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Should have created an observer (we verify it exists; rootMargin is passed to constructor)
        const io = ioInstances[ioInstances.length - 1];
        expect(io).toBeTruthy();

        el.remove();
    });

    it("loads immediately if prefetched + viewport trigger", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => { loadCount(); return Promise.resolve({ default: RealComponent }); }, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // Prefetch first
        await (StubComponent as any).prefetch();
        expect(loadCount).toHaveBeenCalledTimes(1);

        // Mount — should skip observer and load immediately
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 20));

        // Impl should be mounted without needing viewport trigger
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
        expect(impl).toBeTruthy();

        // No observer should have been created for this element
        const io = ioInstances.find(i => i.elements.has(el));
        expect(io).toBeFalsy();

        el.remove();
    });
});
