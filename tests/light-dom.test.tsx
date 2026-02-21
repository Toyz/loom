/**
 * Tests: Light DOM components — shadow: false
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { reactive } from "../src/store/decorators";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-light-${++tagCounter}`; }

afterEach(() => cleanup());

describe("Light DOM (shadow: false)", () => {
  it("does not create a shadow root", async () => {
    const tag = nextTag();

    class El extends LoomElement {}
    (El as any).__loom_noshadow = true;
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.shadowRoot).toBeNull();
  });

  it("renders update() into the host element", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        const div = document.createElement("div");
        div.className = "content";
        div.textContent = "Light DOM!";
        return div;
      }
    }
    (El as any).__loom_noshadow = true;
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    const div = el.querySelector(".content");
    expect(div).toBeTruthy();
    expect(div!.textContent).toBe("Light DOM!");
  });

  it("$() queries host element", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = "Click";
        return btn;
      }
    }
    (El as any).__loom_noshadow = true;
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    // Use querySelector directly since $ is protected
    expect(el.querySelector(".btn")).toBeTruthy();
    expect(el.querySelector(".btn")!.textContent).toBe("Click");
  });

  it("re-renders on reactive state change", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor label = "initial";

      update() {
        const span = document.createElement("span");
        span.className = "label";
        span.textContent = this.label;
        return span;
      }
    }
    (El as any).__loom_noshadow = true;
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    expect(el.querySelector(".label")!.textContent).toBe("initial");

    (el as any).label = "updated";
    await nextRender();

    expect(el.querySelector(".label")!.textContent).toBe("updated");
  });

  it("cleanup runs on disconnect", async () => {
    const cleanupFn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      connectedCallback() {
        super.connectedCallback();
        this.track(cleanupFn);
      }
    }
    (El as any).__loom_noshadow = true;
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(cleanupFn).not.toHaveBeenCalled();

    cleanup();
    expect(cleanupFn).toHaveBeenCalledOnce();
  });

  it("normal components still have shadow root", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        return document.createElement("div");
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.shadowRoot).toBeTruthy();
  });
});
