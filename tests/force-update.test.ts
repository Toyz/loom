/**
 * Tests: scheduleUpdate(force) for state that is not backed by a Reactive.
 *
 * _flushUpdate's Tier-1 skip calls hasDirtyDeps(), which only compares
 * `Reactive` version counters — and returns false for an empty version map.
 * So any component whose state lives in a plain instance field (written by
 * @consume, @media, @fullscreen, @slot or @suspend) rendered exactly once and
 * then never again: the decorator called scheduleUpdate(), the flush ran, the
 * dirty check saw nothing, and the render was dropped.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { reactive } from "../src/store/decorators";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
const nextTag = () => `force-el-${++tagCounter}`;

afterEach(() => cleanup());

describe("scheduleUpdate(force)", () => {
  it("re-renders a component whose state is a plain field", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      plain = "first";
      update() {
        const d = document.createElement("div");
        d.textContent = this.plain;
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.shadowRoot!.textContent).toBe("first");

    el.plain = "second";
    el.scheduleUpdate(true);
    await nextRender();

    expect(el.shadowRoot!.textContent).toBe("second");
  });

  it("without force, a plain-field change is still skipped", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      plain = "first";
      update() {
        const d = document.createElement("div");
        d.textContent = this.plain;
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.plain = "second";
    el.scheduleUpdate();
    await nextRender();

    // Documented behavior: the trace-based skip is the whole point of Tier 1.
    // Non-Reactive state must opt in explicitly.
    expect(el.shadowRoot!.textContent).toBe("first");
  });

  it("forces a render even when a traced Reactive did not change", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @reactive accessor tracked = 1;
      plain = "a";
      update() {
        const d = document.createElement("div");
        d.textContent = `${this.tracked}:${this.plain}`;
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.shadowRoot!.textContent).toBe("1:a");

    el.plain = "b";
    el.scheduleUpdate(true);
    await nextRender();

    expect(el.shadowRoot!.textContent).toBe("1:b");
  });

  it("shouldUpdate() === false still blocks a forced update", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      plain = "first";
      blocked = false;
      shouldUpdate() { return !this.blocked; }
      update() {
        const d = document.createElement("div");
        d.textContent = this.plain;
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.blocked = true;
    el.plain = "second";
    el.scheduleUpdate(true);
    await nextRender();

    expect(el.shadowRoot!.textContent).toBe("first");
  });

  it("the force flag does not leak into the next flush", async () => {
    const tag = nextTag();
    const renders = vi.fn();

    @component(tag)
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() {
        renders();
        const d = document.createElement("div");
        d.textContent = String(this.n);
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    renders.mockClear();

    el.scheduleUpdate(true);
    await nextRender();
    expect(renders).toHaveBeenCalledTimes(1);

    // Nothing changed and no force → Tier 1 skips, update() must not run.
    el.scheduleUpdate();
    await nextRender();
    expect(renders).toHaveBeenCalledTimes(1);
  });

  it("coalesces a forced and an unforced call in the same tick", async () => {
    const tag = nextTag();
    const renders = vi.fn();

    @component(tag)
    class El extends LoomElement {
      plain = "x";
      update() {
        renders();
        const d = document.createElement("div");
        d.textContent = this.plain;
        return d;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    renders.mockClear();

    el.plain = "y";
    el.scheduleUpdate();      // would be skipped alone
    el.scheduleUpdate(true);  // upgrades the already-queued flush
    await nextRender();

    expect(renders).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.textContent).toBe("y");
  });
});

describe("LoomElement lifecycle hardening", () => {
  it("calls shouldUpdate() once per first render", async () => {
    const tag = nextTag();
    const calls = vi.fn(() => true);

    @component(tag)
    class El extends LoomElement {
      @reactive accessor n = 0;
      shouldUpdate() { return calls(); }
      update() {
        const d = document.createElement("div");
        d.textContent = String(this.n);
        return d;
      }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    // Was called twice: once in _flushUpdate, again in _firstRender. That
    // double-invoked side-effecting overrides such as LoomVirtual's.
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("a throwing cleanup does not skip the remaining cleanups", async () => {
    const tag = nextTag();
    const second = vi.fn();
    const third = vi.fn();

    @component(tag)
    class El extends LoomElement {
      connectedCallback() {
        super.connectedCallback();
        this.track(() => { throw new Error("cleanup boom"); });
        this.track(second);
        this.track(third);
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.remove();

    expect(second).toHaveBeenCalledTimes(1);
    expect(third).toHaveBeenCalledTimes(1);
  });

  it("does not re-run cleanups on a second disconnect", async () => {
    const tag = nextTag();
    const ran = vi.fn();

    @component(tag)
    class El extends LoomElement {
      connectedCallback() {
        super.connectedCallback();
        this.track(() => { ran(); throw new Error("boom"); });
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.remove();
    el.disconnectedCallback();

    expect(ran).toHaveBeenCalledTimes(1);
  });

  it("runs __afterUpdate hooks on every render pass", async () => {
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
    el.__afterUpdate = [after];

    el.n = 1;
    await nextRender();
    expect(after).toHaveBeenCalledTimes(1);

    el.n = 2;
    await nextRender();
    expect(after).toHaveBeenCalledTimes(2);
  });

  it("a throwing __afterUpdate hook does not break the render", async () => {
    const tag = nextTag();
    const ok = vi.fn();

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
    el.__afterUpdate = [() => { throw new Error("hook boom"); }, ok];

    el.n = 5;
    await nextRender();

    expect(ok).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.textContent).toBe("5");
  });
});
