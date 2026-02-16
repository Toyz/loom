/**
 * Tests: LoomElement — lifecycle, track, shadow, scheduleUpdate
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { app } from "../src/app";

let tagCounter = 0;
function nextTag() { return `test-el-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("LoomElement", () => {
  it("creates a shadow root on construction", () => {
    const tag = nextTag();
    customElements.define(tag, class extends LoomElement {});
    const el = document.createElement(tag);
    expect(el.shadowRoot).toBeTruthy();
  });

  it("exposes app singleton", () => {
    const tag = nextTag();
    customElements.define(tag, class extends LoomElement {});
    const el = document.createElement(tag) as LoomElement;
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

    const el = document.createElement(tag);
    document.body.appendChild(el);

    // Wait for microtask (scheduleUpdate uses queueMicrotask)
    await new Promise((r) => queueMicrotask(r));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("track() cleanup runs on disconnect", () => {
    const cleanup = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      connectedCallback() {
        super.connectedCallback();
        this.track(cleanup);
      }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(cleanup).not.toHaveBeenCalled();

    document.body.removeChild(el);
    expect(cleanup).toHaveBeenCalledOnce();
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

    const el = document.createElement(tag) as El;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

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

    const el = document.createElement(tag) as El;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

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

    const el = document.createElement(tag);
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));
    expect(fn).not.toHaveBeenCalled();
  });
});
