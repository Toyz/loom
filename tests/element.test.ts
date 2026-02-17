/**
 * Tests: LoomElement — lifecycle, track, shadow, scheduleUpdate
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { app } from "../src/app";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-el-${++tagCounter}`; }

afterEach(() => cleanup());

describe("LoomElement", () => {
  it("creates a shadow root on construction", async () => {
    const tag = nextTag();
    customElements.define(tag, class extends LoomElement {});
    const el = await fixture(tag);
    expect(el.shadowRoot).toBeTruthy();
  });

  it("exposes app singleton", async () => {
    const tag = nextTag();
    customElements.define(tag, class extends LoomElement {});
    const el = await fixture<LoomElement>(tag);
    expect(el.app).toBe(app);
  });

  it("calls firstUpdated once after first render", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      firstUpdated() { fn(); }
      update() { return document.createElement("div"); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("track() cleanup runs on disconnect", async () => {
    const cleanupFn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      connectedCallback() {
        super.connectedCallback();
        this.track(cleanupFn);
      }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(cleanupFn).not.toHaveBeenCalled();

    cleanup(); // triggers disconnectedCallback
    expect(cleanupFn).toHaveBeenCalledOnce();
  });

  it("$(selector) queries shadow DOM", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        const div = document.createElement("div");
        div.className = "target";
        return div;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.$(".target")).toBeTruthy();
  });

  it("$$(selector) returns array", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 3; i++) {
          const span = document.createElement("span");
          span.className = "item";
          frag.appendChild(span);
        }
        return frag;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.$$(".item")).toHaveLength(3);
  });

  it("shouldUpdate() can block renders", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      shouldUpdate() { return false; }
      update() { fn(); return document.createElement("div"); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    await nextRender();
    expect(fn).not.toHaveBeenCalled();
  });
});
