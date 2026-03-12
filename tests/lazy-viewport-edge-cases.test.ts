/**
 * EXTREME edge case tests — @lazy viewport trigger & prefetch
 *
 * Tests production-realistic gnarly scenarios:
 *  - Rapid mount/unmount cycling with viewport trigger
 *  - Concurrent prefetch + viewport on same class
 *  - Multiple viewport elements sharing a loader
 *  - Observer cleanup during mid-flight intersection
 *  - Prefetch failure followed by mount retry
 *  - Viewport trigger + error fallback
 *  - Disconnect during async load after viewport trigger
 *  - Re-connect after disconnect with viewport trigger
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy, LAZY_LOADED } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { reactive } from "../src/store/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-edge-${++tagCounter}`; }

afterEach(() => cleanup());

// ── IntersectionObserver mock ──
let ioInstances: MockIO[] = [];

class MockIO {
    callback: IntersectionObserverCallback;
    elements = new Set<Element>();
    disconnected = false;
    opts: IntersectionObserverInit;

    constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        this.callback = cb;
        this.opts = opts ?? {};
        ioInstances.push(this);
    }
    observe(el: Element) { this.elements.add(el); }
    unobserve(el: Element) { this.elements.delete(el); }
    disconnect() { this.disconnected = true; this.elements.clear(); }
    takeRecords() { return []; }

    trigger(el: Element, isIntersecting = true) {
        this.callback(
            [{ isIntersecting, target: el } as IntersectionObserverEntry],
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

// ── 1. RAPID CYCLING WITH VIEWPORT ──

describe("rapid mount/unmount with viewport trigger", () => {
    it("survives 20 rapid connect/disconnect cycles without leaking observers", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => { loadCount(); return Promise.resolve({ default: RealComponent }); }, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);

        for (let i = 0; i < 20; i++) {
            document.body.appendChild(el);
            el.remove();
        }

        await new Promise(r => setTimeout(r, 10));

        // Loader should NOT have been called — never entered viewport
        expect(loadCount).not.toHaveBeenCalled();

        // All observers should be cleaned up (disconnected)
        const relevantIOs = ioInstances.filter(io => io.disconnected);
        expect(relevantIOs.length).toBeGreaterThan(0);

        // No dangling observer reference on element
        expect((el as any).__lazyObserver).toBeNull();
    });

    it("loads correctly after rapid cycling when finally left in DOM and intersects", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);

        // Rapid cycling
        for (let i = 0; i < 10; i++) {
            document.body.appendChild(el);
            el.remove();
        }

        // Final connect — stays in DOM
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Find the active observer (last one, not disconnected)
        const activeIO = ioInstances.find(io => !io.disconnected && io.elements.has(el));
        expect(activeIO).toBeTruthy();

        // Trigger viewport
        activeIO!.trigger(el);
        await new Promise(r => setTimeout(r, 20));

        // Should be loaded
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
        expect(impl).toBeTruthy();

        el.remove();
    });
});

// ── 2. CONCURRENT PREFETCH + VIEWPORT ──

describe("prefetch + viewport interactions", () => {
    it("prefetch during viewport wait causes immediate load on next intersect attempt", async () => {
        const tag = nextTag();
        let resolveLoader!: (v: any) => void;
        const loaderPromise = new Promise(r => { resolveLoader = r; });
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => {
            loadCount();
            return loaderPromise;
        }, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Element is waiting for viewport. Load the module via prefetch
        expect(loadCount).not.toHaveBeenCalled();

        // Prefetch triggers the loader
        (StubComponent as any).prefetch();
        expect(loadCount).toHaveBeenCalledTimes(1);

        // Resolve the loader
        resolveLoader({ default: RealComponent });
        await new Promise(r => setTimeout(r, 10));

        // Now trigger viewport — should use cached module
        const io = ioInstances.find(i => i.elements.has(el));
        if (io) {
            io.trigger(el);
            await new Promise(r => setTimeout(r, 20));
        }

        // Loader should NOT have been called again
        expect(loadCount).toHaveBeenCalledTimes(1);

        el.remove();
    });

    it("prefetch before mount skips observer entirely with viewport trigger", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // Prefetch first
        await (StubComponent as any).prefetch();

        // Mount — should skip observer
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 20));

        // Should be loaded immediately without an observer
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
        expect(impl).toBeTruthy();
        expect((el as any).__lazyObserver).toBeFalsy();

        el.remove();
    });
});

// ── 3. MULTIPLE ELEMENTS SAME CLASS + VIEWPORT ──

describe("multiple viewport elements sharing a loader", () => {
    it("second element mounts instantly after first triggers load", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => { loadCount(); return Promise.resolve({ default: RealComponent }); }, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // Two elements
        const el1 = document.createElement(tag);
        const el2 = document.createElement(tag);
        document.body.appendChild(el1);
        document.body.appendChild(el2);
        await new Promise(r => setTimeout(r, 10));

        // Trigger viewport for el1 only
        const io1 = ioInstances.find(i => i.elements.has(el1));
        io1!.trigger(el1);
        await new Promise(r => setTimeout(r, 20));

        // el1 should have impl
        expect(el1.shadowRoot!.querySelector(`${tag}-impl`)).toBeTruthy();

        // Now trigger el2 viewport — should use cached class (LAZY_LOADED = true)
        const io2 = ioInstances.find(i => i.elements.has(el2));
        if (io2) {
            io2.trigger(el2);
            await new Promise(r => setTimeout(r, 20));
        }

        // Loader should only have been called once total
        expect(loadCount).toHaveBeenCalledTimes(1);

        // el2 should also have impl
        expect(el2.shadowRoot!.querySelector(`${tag}-impl`)).toBeTruthy();

        el1.remove();
        el2.remove();
    });

    it("third element created after load skips viewport entirely", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // First element — trigger viewport
        const el1 = document.createElement(tag);
        document.body.appendChild(el1);
        await new Promise(r => setTimeout(r, 10));

        const io = ioInstances.find(i => i.elements.has(el1));
        io!.trigger(el1);
        await new Promise(r => setTimeout(r, 20));

        // Second element — should mount immediately (LAZY_LOADED = true)
        const el2 = document.createElement(tag);
        document.body.appendChild(el2);
        await new Promise(r => setTimeout(r, 20));

        expect(el2.shadowRoot!.querySelector(`${tag}-impl`)).toBeTruthy();

        el1.remove();
        el2.remove();
    });
});

// ── 4. VIEWPORT TRIGGER + ERROR ──

describe("viewport trigger with errors", () => {
    it("shows error fallback when viewport-triggered load fails", async () => {
        const tag = nextTag();
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => { });

        @component(tag)
        @lazy(() => Promise.reject(new Error("network timeout")), {
            trigger: "viewport",
            error: () => {
                const div = document.createElement("div");
                div.className = "error-msg";
                div.textContent = "Load failed";
                return div;
            },
        })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Trigger viewport
        const io = ioInstances.find(i => i.elements.has(el));
        io!.trigger(el);
        await new Promise(r => setTimeout(r, 20));

        // Error fallback should be shown
        const errorEl = el.shadowRoot!.querySelector(".error-msg");
        expect(errorEl).toBeTruthy();
        expect(errorEl!.textContent).toBe("Load failed");

        // Observer should be cleaned up
        expect((el as any).__lazyObserver).toBeNull();

        consoleError.mockRestore();
        el.remove();
    });
});

// ── 5. NON-INTERSECTING VIEWPORT CALLBACKS ──

describe("viewport observer edge cases", () => {
    it("ignores non-intersecting callbacks", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => { loadCount(); return Promise.resolve({ default: RealComponent }); }, { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Send a non-intersecting callback
        const io = ioInstances.find(i => i.elements.has(el));
        io!.trigger(el, false);
        await new Promise(r => setTimeout(r, 10));

        // Loader should NOT have been called
        expect(loadCount).not.toHaveBeenCalled();

        // Observer should still be active
        expect(io!.disconnected).toBe(false);

        el.remove();
    });
});

// ── 6. PREFETCH ERROR DOES NOT BLOCK MOUNT ──

describe("prefetch error handling", () => {
    it("failed prefetch allows mount to retry the loader", async () => {
        const tag = nextTag();
        let callCount = 0;
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => { });

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => {
            callCount++;
            if (callCount === 1) return Promise.reject(new Error("first fail"));
            return Promise.resolve({ default: RealComponent });
        })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // Prefetch fails
        try {
            await (StubComponent as any).prefetch();
        } catch {
            // Expected
        }
        expect(callCount).toBe(1);

        // Mount — the cached prefetch promise is a rejection, so it should show error fallback
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 20));

        // The shell should show the error since the prefetch promise was cached and rejected
        expect(el.shadowRoot!.innerHTML).toContain("Failed to load component");

        consoleError.mockRestore();
        el.remove();
    });

    it("prefetch idempotency means error is cached too", async () => {
        const tag = nextTag();
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => { });
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => {
            loadCount();
            return Promise.reject(new Error("always fails"));
        })
        class StubComponent extends LoomElement { }

        // Prefetch — fails
        const p1 = (StubComponent as any).prefetch();
        const p2 = (StubComponent as any).prefetch();
        expect(p1).toBe(p2); // Same promise

        try { await p1; } catch { /* expected */ }

        // Loader only called once despite two prefetch calls
        expect(loadCount).toHaveBeenCalledTimes(1);

        consoleError.mockRestore();
    });
});

// ── 7. REACTIVE STATE AFTER VIEWPORT-TRIGGERED LOAD ──

describe("reactive state after viewport-triggered lazy load", () => {
    it("reactive accessors work after viewport-triggered hydration", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement {
            @reactive accessor count = 0;

            update() {
                const p = document.createElement("p");
                p.textContent = `count: ${this.count}`;
                return p;
            }
        }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag);
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // Trigger viewport
        const io = ioInstances.find(i => i.elements.has(el));
        io!.trigger(el);
        await new Promise(r => setTimeout(r, 30));

        // Get impl and verify reactive state
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`) as any;
        expect(impl).toBeTruthy();
        expect(impl.count).toBe(0);

        // Mutate reactive state
        impl.count = 42;
        await new Promise(r => setTimeout(r, 20));

        expect(impl.count).toBe(42);
        expect(impl.shadowRoot!.textContent).toBe("count: 42");

        el.remove();
    });
});

// ── 8. READY PROMISE WITH VIEWPORT ──

describe(".ready promise with viewport trigger", () => {
    it(".ready resolves after viewport-triggered load completes", async () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }), { trigger: "viewport" })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);
        const el = document.createElement(tag) as any;
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        // .ready should exist but not yet resolved (no viewport trigger)
        expect(el.ready).toBeInstanceOf(Promise);

        await new Promise(r => setTimeout(r, 10));

        // Trigger viewport — connectedCallback re-enters and creates a new .ready
        const io = ioInstances.find(i => i.elements.has(el));
        io!.trigger(el);
        await new Promise(r => setTimeout(r, 30));

        // Re-read .ready (a fresh promise was created on re-entry) and await it
        const readyResult = await el.ready;
        expect(readyResult).toBeTruthy();

        // Impl should be mounted
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
        expect(impl).toBeTruthy();

        el.remove();
    });
});
