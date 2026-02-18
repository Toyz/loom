/**
 * Integration Tests: Traced Template Projection
 *
 * End-to-end tests verifying that state changes through every decorator type
 * correctly flow through the trace pipeline and trigger (or skip) re-renders.
 *
 * Each test exercises the FULL path:
 *   decorator mutation → Reactive.set/notify → scheduleUpdate()
 *   → hasDirtyDeps() → startTrace() → update() → endTrace() → morph()
 *
 * These tests catch the class of bugs where:
 * - A decorator's getter doesn't call recordRead() (lazy init bug)
 * - A mutation doesn't bump the Reactive version (notify vs set)
 * - hasDirtyDeps incorrectly returns false (snapshot comparison)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { reactive, prop, computed, store } from "../src/store/decorators";
import { api } from "../src/query/decorators";
import { component } from "../src/element/decorators";
import { fixture, cleanup, nextRender } from "../src/testing";
import type { ApiState } from "../src/query/types";

let tagCounter = 0;
function nextTag() { return `trace-integ-${++tagCounter}`; }

afterEach(() => cleanup());

// ── Helper: count update() calls on a live element ──

function spyOnUpdate(el: any): { calls: number; lastResult: any } {
  const spy = { calls: 0, lastResult: null as any };
  const orig = el.update.bind(el);
  el.update = function () {
    spy.calls++;
    spy.lastResult = orig();
    return spy.lastResult;
  };
  return spy;
}

// ─────────────────────────────────────────────────────
// @reactive — primitive state
// ─────────────────────────────────────────────────────

describe("trace integration: @reactive", () => {
  it("re-renders when a read @reactive changes", async () => {
    const tag = nextTag();
    class El extends LoomElement {
      @reactive accessor count = 0;
      update() {
        const span = document.createElement("span");
        span.textContent = String(this.count);
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("0");

    // Mutate and wait for re-render
    el.count = 42;
    await nextRender();
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("42");
  });

  it("skips re-render when an UNREAD @reactive changes", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @reactive accessor visible = 0;
      @reactive accessor unused_ = 0;
      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = String(this.visible); // only reads `visible`
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1); // initial render

    // Change the one that's NOT read in update()
    el.unused_ = 99;
    await nextRender();
    // hasDirtyDeps should return false → update() NOT called again
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Change the one that IS read
    el.visible = 7;
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("7");
  });

  it("re-renders on multiple sequential changes (batched)", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @reactive accessor a = 0;
      @reactive accessor b = 0;
      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = `${this.a}-${this.b}`;
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Two synchronous changes should batch into one render
    el.a = 1;
    el.b = 2;
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("1-2");
  });
});

// ─────────────────────────────────────────────────────
// @prop — attribute-backed reactive
// ─────────────────────────────────────────────────────

describe("trace integration: @prop", () => {
  it("re-renders when a @prop value changes via property", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @prop accessor label = "default";
      update() {
        const span = document.createElement("span");
        span.textContent = this.label;
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("default");

    el.label = "changed";
    await nextRender();
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("changed");
  });

  it("re-renders when a @prop value changes via second set", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @prop accessor title = "";
      update() {
        const span = document.createElement("span");
        span.textContent = this.title;
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.title = "initial";
    await nextRender();
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("initial");

    el.title = "updated";
    await nextRender();
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("updated");
  });

  it("re-renders on prop read-before-set (the original bug)", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @prop accessor hot = 0;
      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = String(this.hot);
        return span;
      }
    }
    customElements.define(tag, El);

    // Create element — prop `hot` defaults to 0, never explicitly set
    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("0");

    // Now set via property (simulates parent morph patching)
    (el as any).hot = 1;
    await nextRender();
    // This is the exact bug we fixed — update MUST be called
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("1");
  });
});

// ─────────────────────────────────────────────────────
// @store — deep proxy with in-place mutations
// ─────────────────────────────────────────────────────

describe("trace integration: @store", () => {
  it("re-renders on top-level property mutation", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @store<{ filter: string }>({ filter: "all" })
      accessor data!: { filter: string };
      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = this.data.filter;
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("all");

    el.data.filter = "active";
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("active");
  });

  it("re-renders on array push (in-place mutation via notify)", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @store<{ items: string[] }>({ items: [] })
      accessor data!: { items: string[] };
      update() {
        updateSpy();
        const div = document.createElement("div");
        div.textContent = this.data.items.join(",");
        return div;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    el.data.items.push("todo1");
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("div")?.textContent).toBe("todo1");

    el.data.items.push("todo2");
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect((el as any).shadowRoot.querySelector("div")?.textContent).toBe("todo1,todo2");
  });

  it("re-renders on nested property mutation", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @store<{ meta: { count: number } }>({ meta: { count: 0 } })
      accessor data!: { meta: { count: number } };
      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = String(this.data.meta.count);
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    el.data.meta.count = 42;
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("42");
  });

  it("re-renders on full store replacement", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @store<{ value: number }>({ value: 0 })
      accessor data!: { value: number };
      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = String(this.data.value);
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    el.data = { value: 99 };
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("99");
  });
});

// ─────────────────────────────────────────────────────
// @api — async data fetching with sentinel Reactive
// ─────────────────────────────────────────────────────

describe("trace integration: @api", () => {
  it("re-renders from loading to data when fetch resolves", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @api<{ name: string }>(() => Promise.resolve({ name: "Ada" }))
      accessor user!: ApiState<{ name: string }>;
      update() {
        updateSpy();
        const span = document.createElement("span");
        if (this.user.loading) {
          span.textContent = "loading";
        } else if (this.user.ok) {
          span.textContent = this.user.data!.name;
        } else {
          span.textContent = "error";
        }
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    // After initial render + microtask flush, the fetch should have resolved
    // and the component should have re-rendered with data
    await nextRender();
    await nextRender(); // extra flush for the async fetch resolve

    expect(updateSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("Ada");
  });

  it("re-renders on refetch", async () => {
    const tag = nextTag();
    let call = 0;

    class El extends LoomElement {
      @api<{ v: number }>(() => Promise.resolve({ v: ++call }))
      accessor data!: ApiState<{ v: number }>;
      update() {
        const span = document.createElement("span");
        span.textContent = this.data.ok ? String(this.data.data!.v) : "loading";
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();
    await nextRender();

    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("1");

    el.data.refetch();
    await nextRender();
    await nextRender();
    await nextRender();

    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("2");
  });

  it("re-renders on fetch error", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @api<{ ok: boolean }>(() => Promise.reject(new Error("network")))
      accessor data!: ApiState<{ ok: boolean }>;
      update() {
        const span = document.createElement("span");
        span.textContent = this.data.error ? this.data.error.message : "ok";
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();
    await nextRender();

    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("network");
  });
});

// ─────────────────────────────────────────────────────
// @computed — derived state
// ─────────────────────────────────────────────────────

describe("trace integration: @computed", () => {
  it("re-renders when underlying reactive causes computed to change", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @reactive accessor items: string[] = [];

      @computed
      get count() { return this.items.length; }

      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = String(this.count);
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("0");

    el.items = ["a", "b"];
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("2");
  });
});

// ─────────────────────────────────────────────────────
// Mixed decorators — real-world-like component
// ─────────────────────────────────────────────────────

describe("trace integration: mixed decorators", () => {
  it("component using @reactive + @store + @computed all update correctly", async () => {
    const tag = nextTag();
    const updateSpy = vi.fn();

    class El extends LoomElement {
      @reactive accessor mode = "edit";

      @store<{ items: string[] }>({ items: [] })
      accessor data!: { items: string[] };

      @computed
      get summary() {
        return `${this.mode}:${this.data.items.length}`;
      }

      update() {
        updateSpy();
        const span = document.createElement("span");
        span.textContent = this.summary;
        return span;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("edit:0");

    // Change @reactive
    el.mode = "view";
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("view:0");

    // Change @store (in-place mutation)
    el.data.items.push("item1");
    await nextRender();
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect((el as any).shadowRoot.querySelector("span")?.textContent).toBe("view:1");
  });
});
