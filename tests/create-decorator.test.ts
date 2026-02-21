/**
 * Tests: createDecorator — universal decorator factory (TC39 Stage 3)
 *
 * New API: setup runs at DEFINE time.
 * If setup returns a function, it runs on CONNECT.
 * If the connect function returns a function, it runs on DISCONNECT.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createDecorator } from "../src/decorators/create";
import { LoomElement } from "../src/element";
import { fixture, cleanup } from "../src/testing";

afterEach(() => cleanup());

/** Helper to define a unique custom element for each test */
let tagCounter = 0;
function nextTag() { return `test-cd-${++tagCounter}`; }

describe("createDecorator", () => {
  it("calls setup at define-time on prototype", () => {
    const setup = vi.fn();
    const myDec = createDecorator(setup);
    const tag = nextTag();

    class El extends LoomElement {
      @myDec()
      myMethod() {}
    }

    // Setup is called at define-time (before element creation)
    expect(setup).toHaveBeenCalledOnce();
    // First arg is the method function, second is "myMethod"
    expect(typeof setup.mock.calls[0][0]).toBe("function");
    expect(setup.mock.calls[0][1]).toBe("myMethod");
  });

  it("passes decorator arguments to setup at define-time", () => {
    const setup = vi.fn();
    const myDec = createDecorator<[url: string, retries: number]>(setup);

    class El extends LoomElement {
      @myDec("ws://localhost", 3)
      connect() {}
    }

    expect(setup).toHaveBeenCalledOnce();
    expect(typeof setup.mock.calls[0][0]).toBe("function");
    expect(setup.mock.calls[0][1]).toBe("connect");
    expect(setup.mock.calls[0][2]).toBe("ws://localhost");
    expect(setup.mock.calls[0][3]).toBe(3);
  });

  it("runs connect function on connectedCallback", async () => {
    const connectFn = vi.fn();
    const myDec = createDecorator((_method, _key) => {
      return connectFn;  // connect function
    });
    const tag = nextTag();

    class El extends LoomElement {
      @myDec()
      handler() {}
    }
    customElements.define(tag, El);

    expect(connectFn).not.toHaveBeenCalled();

    const el = await fixture<El>(tag);
    expect(connectFn).toHaveBeenCalledOnce();
    expect(connectFn).toHaveBeenCalledWith(el);
  });

  it("tracks cleanup function for disconnect", async () => {
    const cleanupFn = vi.fn();
    const myDec = createDecorator((_method, _key) => {
      return (_el: any) => cleanupFn;  // connect returns cleanup
    });
    const tag = nextTag();

    class El extends LoomElement {
      @myDec()
      handler() {}
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(cleanupFn).not.toHaveBeenCalled();

    cleanup(); // triggers disconnectedCallback
    expect(cleanupFn).toHaveBeenCalledOnce();
  });

  it("does not break if setup returns void (define-time only)", async () => {
    const myDec = createDecorator((_method, _key) => { /* no connect */ });
    const tag = nextTag();

    class El extends LoomElement {
      @myDec()
      handler() {}
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(() => {
      cleanup();
    }).not.toThrow();
  });

  it("supports class decorators with { class: true }", () => {
    const setup = vi.fn();
    const myDec = createDecorator<[tag: string]>(setup, { class: true });

    @myDec("my-widget")
    class El extends LoomElement {}

    expect(setup).toHaveBeenCalledOnce();
    expect(setup).toHaveBeenCalledWith(El, "my-widget");
  });

  it("works with typed element generic", async () => {
    const connectFn = vi.fn();
    const myDec = createDecorator((_method: Function, _key: string) => {
      return connectFn;
    });
    const tag = nextTag();

    class El extends LoomElement {
      @myDec()
      fetchData() {}
    }
    customElements.define(tag, El);

    await fixture<El>(tag);
    expect(connectFn).toHaveBeenCalledOnce();
  });
});
