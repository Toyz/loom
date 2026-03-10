/**
 * Tests: DSD Hydration — Declarative Shadow DOM
 *
 * Verifies that LoomElement detects existing shadow roots created by
 * <template shadowrootmode="open"> and hydrates them instead of
 * rendering from scratch.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement, reactive } from "../src/index";
import { cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-dsd-${++tagCounter}`; }

afterEach(() => cleanup());

describe("DSD Hydration", () => {
    it("reuses an existing shadow root (DSD detection)", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            update() {
                const p = document.createElement("p");
                p.textContent = "hydrated";
                return p;
            }
        }
        customElements.define(tag, El);

        // Simulate DSD: create element with <template shadowrootmode="open">
        const container = document.createElement("div");
        document.body.appendChild(container);
        container.innerHTML = `<${tag}><template shadowrootmode="open"><p>pre-rendered</p></template></${tag}>`;

        const el = container.querySelector(tag) as LoomElement;

        // DSD should have auto-attached the shadow root
        expect(el.shadowRoot).toBeTruthy();

        // Wait for render
        await nextRender();

        // The shadow root should now contain hydrated content from update()
        const p = el.shadowRoot!.querySelector("p");
        expect(p).toBeTruthy();
        expect(p!.textContent).toBe("hydrated");

        container.remove();
    });

    it("normal CSR still works without DSD", async () => {
        const tag = nextTag();
        const fn = vi.fn();

        class El extends LoomElement {
            update() {
                fn();
                const div = document.createElement("div");
                div.className = "csr";
                div.textContent = "client-rendered";
                return div;
            }
        }
        customElements.define(tag, El);

        const container = document.createElement("div");
        document.body.appendChild(container);
        const el = document.createElement(tag);
        container.appendChild(el);

        await nextRender();

        expect(fn).toHaveBeenCalled();
        expect(el.shadowRoot).toBeTruthy();
        const div = el.shadowRoot!.querySelector(".csr");
        expect(div).toBeTruthy();
        expect(div!.textContent).toBe("client-rendered");

        container.remove();
    });

    it("reactive updates work after DSD hydration", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @reactive accessor count = 0;
            update() {
                const p = document.createElement("p");
                p.textContent = `count: ${this.count}`;
                return p;
            }
        }
        customElements.define(tag, El);

        const container = document.createElement("div");
        document.body.appendChild(container);
        const el = document.createElement(tag) as InstanceType<typeof El>;
        container.appendChild(el);

        await nextRender();

        expect(el.shadowRoot!.querySelector("p")!.textContent).toBe("count: 0");

        // Reactive update
        el.count = 42;
        await nextRender();

        expect(el.shadowRoot!.querySelector("p")!.textContent).toBe("count: 42");

        container.remove();
    });

    it("firstUpdated fires after first render", async () => {
        const tag = nextTag();
        const fn = vi.fn();

        class El extends LoomElement {
            firstUpdated() { fn(); }
            update() { return document.createElement("div"); }
        }
        customElements.define(tag, El);

        const container = document.createElement("div");
        document.body.appendChild(container);
        const el = document.createElement(tag);
        container.appendChild(el);

        await nextRender();
        expect(fn).toHaveBeenCalledOnce();

        container.remove();
    });
});
