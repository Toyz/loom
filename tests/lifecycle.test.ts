/**
 * Tests: @mount, @unmount, @catch_, @suspend
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { mount, unmount, catch_, suspend } from "../src/element/lifecycle";
import { MOUNT_HANDLERS, UNMOUNT_HANDLERS } from "../src/decorators/symbols";

let tagCounter = 0;
function nextTag() { return `test-lc-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("@mount", () => {
  it("runs on connect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      setup() { fn(); }
    }
    mount(El.prototype, "setup");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("supports multiple @mount methods", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      a() { fn1(); }
      b() { fn2(); }
    }
    mount(El.prototype, "a");
    mount(El.prototype, "b");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });
});

describe("@unmount", () => {
  it("runs on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      teardown() { fn(); }
    }
    unmount(El.prototype, "teardown");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(fn).not.toHaveBeenCalled();

    document.body.removeChild(el);
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

    const el = document.createElement(tag);
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

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

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

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

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await el.fetchData();

    expect(el.loading).toBe(false);
    expect(el.error).toBeInstanceOf(Error);
    expect(el.error.message).toBe("fail");
  });
});
