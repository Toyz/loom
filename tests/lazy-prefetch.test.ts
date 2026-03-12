/**
 * Tests: @lazy prefetch — pre-warming the import cache
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-pf-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@lazy prefetch()", () => {
    it("exposes a static .prefetch() method on the shell class", () => {
        const tag = nextTag();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => Promise.resolve({ default: RealComponent }))
        class StubComponent extends LoomElement { }

        expect(typeof (StubComponent as any).prefetch).toBe("function");
    });

    it("prefetch() warms the cache — loader is only called once", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        const loader = () => {
            loadCount();
            return Promise.resolve({ default: RealComponent });
        };

        @component(tag)
        @lazy(loader)
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // Prefetch
        await (StubComponent as any).prefetch();
        expect(loadCount).toHaveBeenCalledTimes(1);

        // Mount — should reuse cached module
        const el = await fixture(tag);
        await new Promise(r => setTimeout(r, 10));

        // Loader should NOT be called again
        expect(loadCount).toHaveBeenCalledTimes(1);

        // But impl should be mounted
        const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
        expect(impl).toBeTruthy();
    });

    it("prefetch() is idempotent — multiple calls return same promise", async () => {
        const tag = nextTag();
        const loadCount = vi.fn();

        class RealComponent extends LoomElement { }

        @component(tag)
        @lazy(() => {
            loadCount();
            return Promise.resolve({ default: RealComponent });
        })
        class StubComponent extends LoomElement { }

        const p1 = (StubComponent as any).prefetch();
        const p2 = (StubComponent as any).prefetch();
        const p3 = (StubComponent as any).prefetch();

        expect(p1).toBe(p2);
        expect(p2).toBe(p3);

        await p1;
        expect(loadCount).toHaveBeenCalledTimes(1);
    });

    it("prefetched module is used by connectedCallback", async () => {
        const tag = nextTag();
        let loaderCallCount = 0;

        class RealComponent extends LoomElement {
            update() {
                const p = document.createElement("p");
                p.textContent = "real content";
                return p;
            }
        }

        @component(tag)
        @lazy(() => {
            loaderCallCount++;
            return Promise.resolve({ default: RealComponent });
        })
        class StubComponent extends LoomElement { }

        customElements.define(tag, StubComponent);

        // Prefetch resolves the module
        await (StubComponent as any).prefetch();
        expect(loaderCallCount).toBe(1);

        // Mount three instances — none should trigger a new load
        const el1 = document.createElement(tag);
        const el2 = document.createElement(tag);
        const el3 = document.createElement(tag);
        document.body.appendChild(el1);
        document.body.appendChild(el2);
        document.body.appendChild(el3);

        await new Promise(r => setTimeout(r, 20));
        expect(loaderCallCount).toBe(1);

        // All three should have impl mounted
        for (const el of [el1, el2, el3]) {
            const impl = el.shadowRoot!.querySelector(`${tag}-impl`);
            expect(impl).toBeTruthy();
        }

        el1.remove();
        el2.remove();
        el3.remove();
    });
});
