/**
 * Tests: @hotkey decorator
 *
 * Covers:
 *  - Single combo matching (ctrl+k)
 *  - Multi-combo matching (ctrl+s, cmd+s)
 *  - Global mode (document vs element)
 *  - Modifier matching (ctrl, shift, alt, meta)
 *  - preventDefault behavior
 *  - Auto tabindex on element
 *  - Cleanup on disconnect
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { hotkey } from "../src/element/hotkey";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-hotkey-${++tagCounter}`; }

afterEach(() => {
    cleanup();
});

/** Create a KeyboardEvent with modifier flags */
function key(k: string, opts: Partial<KeyboardEventInit> = {}): KeyboardEvent {
    return new KeyboardEvent("keydown", {
        key: k,
        bubbles: true,
        cancelable: true,
        ...opts,
    });
}

describe("@hotkey", () => {
    it("fires on matching key combo", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+k")
            handler(e: KeyboardEvent) { fn(e.key); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.dispatchEvent(key("k", { ctrlKey: true }));
        expect(fn).toHaveBeenCalledWith("k");
    });

    it("does not fire on wrong key", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+k")
            handler() { fn(); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.dispatchEvent(key("j", { ctrlKey: true }));
        expect(fn).not.toHaveBeenCalled();
    });

    it("does not fire when modifier is missing", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+k")
            handler() { fn(); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.dispatchEvent(key("k")); // no ctrlKey
        expect(fn).not.toHaveBeenCalled();
    });

    it("supports multiple combo bindings", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+s", "meta+s")
            handler() { fn(); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);

        el.dispatchEvent(key("s", { ctrlKey: true }));
        expect(fn).toHaveBeenCalledTimes(1);

        el.dispatchEvent(key("s", { metaKey: true }));
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("matches shift modifier", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+shift+p")
            handler() { fn(); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.dispatchEvent(key("p", { ctrlKey: true, shiftKey: true }));
        expect(fn).toHaveBeenCalledOnce();
    });

    it("matches simple key without modifiers", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("escape")
            handler() { fn(); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.dispatchEvent(key("Escape"));
        expect(fn).toHaveBeenCalledOnce();
    });

    it("calls preventDefault by default", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+k")
            handler() { }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        const e = key("k", { ctrlKey: true });
        const spy = vi.spyOn(e, "preventDefault");
        el.dispatchEvent(e);
        expect(spy).toHaveBeenCalled();
    });

    it("skips preventDefault when option is false", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("ctrl+k", { preventDefault: false })
            handler() { }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        const e = key("k", { ctrlKey: true });
        const spy = vi.spyOn(e, "preventDefault");
        el.dispatchEvent(e);
        expect(spy).not.toHaveBeenCalled();
    });

    it("auto-adds tabindex to element", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("escape")
            handler() { }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        expect(el.getAttribute("tabindex")).toBe("0");
    });

    it("does not override existing tabindex", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("escape")
            handler() { }
        }
        customElements.define(tag, El);

        const el = document.createElement(tag);
        el.setAttribute("tabindex", "-1");
        document.body.appendChild(el);
        // Wait for connectedCallback
        await new Promise(r => setTimeout(r, 0));

        expect(el.getAttribute("tabindex")).toBe("-1");
        el.remove();
    });

    it("global mode listens on document", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("escape", { global: true })
            handler() { fn(); }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);

        // Dispatch on document (not the element)
        document.dispatchEvent(key("Escape"));
        expect(fn).toHaveBeenCalledOnce();
    });

    it("cleans up on disconnect", async () => {
        const fn = vi.fn();
        const tag = nextTag();

        class El extends LoomElement {
            @hotkey("escape", { global: true })
            handler() { fn(); }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        cleanup(); // triggers disconnectedCallback

        document.dispatchEvent(key("Escape"));
        expect(fn).not.toHaveBeenCalled();
    });
});
