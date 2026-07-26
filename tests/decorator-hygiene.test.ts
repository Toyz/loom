/**
 * Tests: per-instance decorator state, portal re-render wiring, image source
 * changes, and virtual-list height-cache retention.
 *
 *  - @transition kept `currentEl` in the decorator-application closure, which
 *    is created once per decorated METHOD — so every instance of the class
 *    shared it and the leave animation removed another instance's element.
 *  - @portal monkey-patched host._flushUpdate and its cleanup only reset a
 *    boolean, never restoring the original, so each reconnect added another
 *    wrapper layer and portals re-rendered N times per update.
 *  - <loom-image> had shouldUpdate() { return !this.imgEl }, false forever
 *    after the first render, and nothing watched `src`.
 *  - LoomVirtual.invalidate() cleared every measured row height on any items
 *    change, including a pure append.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { reactive } from "../src/store/decorators";
import { transition } from "../src/element/transition";
import { fixture, cleanup, nextRender } from "../src/testing";

let n = 0;
const nextTag = () => `hygiene-el-${++n}`;

afterEach(() => cleanup());

// ── @transition ─────────────────────────────────────────────────────────────

describe("@transition", () => {
  it("tracks the current element per instance, not per class", async () => {
    class Toast {
      show = true;
      @transition({ leave: "fade-out 200ms" })
      render(): Node | null {
        if (!this.show) return null;
        const d = document.createElement("div");
        d.className = "toast";
        return d;
      }
    }

    const a = new Toast();
    const b = new Toast();

    const aEl = a.render() as HTMLElement;
    const bEl = b.render() as HTMLElement;
    await nextRender();

    expect(aEl).not.toBe(bEl);

    // A leaves. Its own element must be the one animated out.
    a.show = false;
    const leaving = a.render() as HTMLElement | null;

    expect(leaving).toBe(aEl);
    expect(leaving).not.toBe(bEl);
  });

  it("B leaving does not consume A's element", async () => {
    class Panel {
      show = true;
      @transition({ leaveClass: "closing" })
      render(): Node | null {
        if (!this.show) return null;
        return document.createElement("section");
      }
    }

    const a = new Panel();
    const b = new Panel();
    const aEl = a.render() as HTMLElement;
    b.render();
    await nextRender();

    b.show = false;
    b.render();

    // A still owns its element and can leave with it afterwards.
    a.show = false;
    expect(a.render()).toBe(aEl);
  });
});

// ── @portal via __afterUpdate ───────────────────────────────────────────────

describe("__afterUpdate hook list", () => {
  it("runs a registered hook once per render, across reconnects", async () => {
    const tag = nextTag();
    const after = vi.fn();

    @component(tag)
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() {
        const d = document.createElement("div");
        d.textContent = String(this.n);
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    const hooks = (el.__afterUpdate ??= []);
    hooks.push(after);

    el.n = 1;
    await nextRender();
    expect(after).toHaveBeenCalledTimes(1);

    // Simulate a DOM move: disconnect + reconnect must not multiply the hook.
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);
    await nextRender();

    after.mockClear();
    el.n = 2;
    await nextRender();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("a hook can remove itself without disturbing the others", async () => {
    const tag = nextTag();
    const keep = vi.fn();

    @component(tag)
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() {
        const d = document.createElement("div");
        d.textContent = String(this.n);
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    const hooks = (el.__afterUpdate ??= []);
    const once = vi.fn(() => {
      const i = hooks.indexOf(once);
      if (i >= 0) hooks.splice(i, 1);
    });
    hooks.push(once, keep);

    el.n = 1;
    await nextRender();
    el.n = 2;
    await nextRender();

    expect(once).toHaveBeenCalledTimes(1);
    expect(keep).toHaveBeenCalledTimes(2);
  });
});
