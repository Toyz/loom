/**
 * Tests: @mount, @unmount, @catch_, @suspend (TC39 Stage 3)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { mount, unmount, catch_, suspend } from "../src/element/lifecycle";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lc-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@mount", () => {
  it("runs on connect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @mount
      setup() { fn(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("supports multiple @mount methods", async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @mount
      a() { fn1(); }

      @mount
      b() { fn2(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });
});

describe("@unmount", () => {
  it("runs on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @unmount
      teardown() { fn(); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(fn).not.toHaveBeenCalled();

    cleanup(); // triggers disconnectedCallback
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("@catch_", () => {
  it("catches errors from update() and calls handler", async () => {
    const handler = vi.fn();
    const tag = nextTag();

    @catch_(handler)
    class El extends LoomElement {
      update() { throw new Error("boom"); }
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    await nextRender();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0].message).toBe("boom");
  });
});

describe("@suspend", () => {
  it("sets loading=true during async, false after", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      loading = false;
      error: Error | null = null;
      result = "";

      @suspend()
      async fetchData() {
        this.result = "done";
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    const promise = el.fetchData();
    expect(el.loading).toBe(true);

    await promise;
    expect(el.loading).toBe(false);
    expect(el.result).toBe("done");
  });

  it("captures errors on failure", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      loading = false;
      error: Error | null = null;

      @suspend()
      async fetchData() {
        throw new Error("fail");
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await el.fetchData();

    expect(el.loading).toBe(false);
    expect(el.error).toBeInstanceOf(Error);
    expect(el.error!.message).toBe("fail");
  });
});
