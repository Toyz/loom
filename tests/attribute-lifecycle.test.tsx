/**
 * Tests: @attribute controller teardown, disposal safety, reactive discovery
 * and rich-arg updates.
 *
 *  - disposeTree() bailed on `nodeType !== 1`, but detachRoot receives whatever
 *    root was observed — and LoomElement observes `this.shadow`, a ShadowRoot
 *    (nodeType 11). So every controller inside a component's shadow leaked when
 *    the component was removed: timers kept firing and the render <div> stayed
 *    in the portal target.
 *  - A render queued before unmount ran afterwards, re-creating the shadow host
 *    and appending an orphan node nothing would ever remove.
 *  - _subscribeReactives() ran AFTER the first render and discovered backing
 *    stores by scanning own symbols; @reactive stores are created lazily on
 *    first read, so a field not read by the first render was never subscribed.
 *  - attach()'s already-mounted branch only called __update(value), which
 *    early-returns on an unchanged string — and an object arg always writes the
 *    marker attribute as "" — so rich JSX args froze at their first value.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  LoomAttribute, attribute, observeAttributes, LoomElement, component, interval,
} from "../src/element";
import { prop, reactive } from "../src/store";
import { morph } from "../src/morph";
import { cleanup, fixture } from "../src/testing";

afterEach(() => cleanup());

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => queueMicrotask(r));
  await new Promise<void>((r) => setTimeout(r, 0));
}

let n = 0;
const nextAttr = () => `lifecycle-attr-${++n}`;
const nextTag = () => `lifecycle-el-${++n}`;

describe("controller disposal inside a component shadow root", () => {
  it("unmounts controllers when the host component is removed", async () => {
    const attrName = nextAttr();
    const tag = nextTag();
    const disconnected = vi.fn();

    @attribute(attrName)
    class Marker extends LoomAttribute {
      disconnect() { disconnected(); }
    }
    void Marker;

    @component(tag)
    class Panel extends LoomElement {
      update() {
        const d = document.createElement("div");
        d.setAttribute(attrName, "");
        return d;
      }
    }
    customElements.define(tag, Panel);

    const el = await fixture<Panel>(tag);
    await flush();

    el.remove();
    await flush();

    expect(disconnected).toHaveBeenCalledTimes(1);
  });

  it("clears a controller's @interval when the host component is removed", async () => {
    vi.useFakeTimers();
    try {
      const attrName = nextAttr();
      const tick = vi.fn();

      @attribute(attrName)
      class Ticker extends LoomAttribute {
        @interval(100)
        onTick() { tick(); }
      }
      void Ticker;

      const host = document.createElement("div");
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });
      const inner = document.createElement("div");
      inner.setAttribute(attrName, "");
      shadow.appendChild(inner);

      const stop = observeAttributes(shadow);
      vi.advanceTimersByTime(250);
      expect(tick).toHaveBeenCalledTimes(2);

      // detachRoot(shadowRoot) — nodeType 11. This used to leave the interval running.
      stop();
      tick.mockClear();
      vi.advanceTimersByTime(500);
      expect(tick).toHaveBeenCalledTimes(0);

      host.remove();
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes the portal render node when the shadow root is detached", async () => {
    const attrName = nextAttr();

    @attribute(attrName)
    class Bubble extends LoomAttribute {
      update() {
        const d = document.createElement("b");
        d.textContent = "tip";
        return d;
      }
    }
    void Bubble;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("div");
    inner.setAttribute(attrName, "");
    shadow.appendChild(inner);

    const stop = observeAttributes(shadow);
    await flush();
    expect(document.querySelectorAll(`div[data-loom-attr="${attrName}"]`).length).toBe(1);

    stop();
    await flush();
    expect(document.querySelectorAll(`div[data-loom-attr="${attrName}"]`).length).toBe(0);

    host.remove();
  });
});

describe("disposal safety", () => {
  it("a render queued before unmount leaves no orphan node", async () => {
    const attrName = nextAttr();
    let inst!: Late;

    @attribute(attrName)
    class Late extends LoomAttribute {
      @reactive accessor label = "a";
      connect() { inst = this; }
      update() {
        const d = document.createElement("i");
        d.textContent = this.label;
        return d;
      }
    }
    void Late;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const el = document.createElement("div");
    el.setAttribute(attrName, "");
    host.appendChild(el);
    const stop = observeAttributes(host);
    await flush();

    expect(document.querySelectorAll(`div[data-loom-attr="${attrName}"]`).length).toBe(1);

    // Queue a re-render, then tear down in the SAME tick. The queued microtask
    // used to run afterwards, call _ensureShadow(), and append a fresh render
    // <div> whose removal cleanup went onto an already-drained array.
    inst.label = "b";
    stop();
    await flush();

    expect(document.querySelectorAll(`div[data-loom-attr="${attrName}"]`).length).toBe(0);
    host.remove();
  });

  it("a throwing cleanup does not stop the remaining teardown", async () => {
    const attrName = nextAttr();
    const disconnected = vi.fn();

    @attribute(attrName)
    class Boom extends LoomAttribute {
      connect() {
        this.track(() => { throw new Error("cleanup boom"); });
      }
      disconnect() { disconnected(); }
    }
    void Boom;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const el = document.createElement("div");
    el.setAttribute(attrName, "");
    host.appendChild(el);
    const stop = observeAttributes(host);
    await flush();

    stop();
    expect(disconnected).toHaveBeenCalledTimes(1);
    host.remove();
  });
});

describe("reactive discovery before first render", () => {
  it("re-renders on a field the first render never read", async () => {
    const attrName = nextAttr();
    let inst!: Conditional;

    @attribute(attrName)
    class Conditional extends LoomAttribute {
      @reactive accessor open = false;
      @reactive accessor detail = "the-detail";
      connect() { inst = this; }
      update() {
        const d = document.createElement("span");
        // `detail` is NOT read on the first pass — its backing Reactive does
        // not exist yet when the old code went looking for subscribables.
        d.textContent = this.open ? this.detail : "closed";
        return d;
      }
    }
    void Conditional;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const el = document.createElement("div");
    el.setAttribute(attrName, "");
    host.appendChild(el);
    const stop = observeAttributes(host);
    await flush();

    const portal = document.querySelector(`div[data-loom-attr="${attrName}"]`)!;
    expect(portal.shadowRoot!.textContent).toBe("closed");

    // Take the branch that reads `detail`.
    inst.open = true;
    await flush();
    expect(portal.shadowRoot!.textContent).toBe("the-detail");

    // And a later write to `detail` itself must also re-render.
    inst.detail = "updated";
    await flush();
    expect(portal.shadowRoot!.textContent).toBe("updated");

    stop();
    host.remove();
  });
});

describe("rich JSX args update across re-renders", () => {
  it("pushes a changed object arg into the controller's @prop", async () => {
    const attrName = nextAttr();
    const seen: string[] = [];

    @attribute(attrName)
    class Tip extends LoomAttribute {
      @prop accessor text = "";
      update() {
        seen.push(this.text);
        const d = document.createElement("b");
        d.textContent = this.text;
        return d;
      }
    }
    void Tip;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const stop = observeAttributes(shadow);

    // Render 1 — jsx() would call setAttrArg; emulate it directly.
    const build = (text: string) => {
      const btn = document.createElement("button");
      btn.setAttribute(attrName, "");
      (btn as any).__loomAttrArgs = { [attrName]: { text } };
      return btn;
    };

    morph(shadow, build("first"));
    await flush();
    expect(seen).toContain("first");

    // Render 2 — morph patches the SAME button; the arg must follow.
    morph(shadow, build("second"));
    await flush();

    expect(seen).toContain("second");
    stop();
    host.remove();
  });
});
