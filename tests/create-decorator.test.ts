/**
 * Tests: createDecorator — universal decorator factory
 *
 * New API: setup runs at DEFINE time on the prototype.
 * If setup returns a function, it runs on CONNECT.
 * If the connect function returns a function, it runs on DISCONNECT.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDecorator } from "../src/decorators/create";
import { LoomElement } from "../src/element";
import { app } from "../src/app";

// Reset app state between tests
beforeEach(() => {
  document.body.innerHTML = "";
});

/** Helper to define a unique custom element for each test */
let tagCounter = 0;
function nextTag() { return `test-cd-${++tagCounter}`; }

describe("createDecorator", () => {
  it("calls setup at define-time on prototype", () => {
    const setup = vi.fn();
    const myDec = createDecorator(setup);
    const tag = nextTag();

    class El extends LoomElement {}
    myDec()(El.prototype, "myMethod");

    // Setup is called at define-time (before element creation)
    expect(setup).toHaveBeenCalledOnce();
    // Can't deep-compare El.prototype (HappyDOM DOM objects break Vitest matcher)
    expect(setup.mock.calls[0][0]).toBe(El.prototype);
    expect(setup.mock.calls[0][1]).toBe("myMethod");
  });

  it("passes decorator arguments to setup at define-time", () => {
    const setup = vi.fn();
    const myDec = createDecorator<[url: string, retries: number]>(setup);

    class El extends LoomElement {}
    myDec("ws://localhost", 3)(El.prototype, "connect");

    expect(setup).toHaveBeenCalledOnce();
    expect(setup.mock.calls[0][0]).toBe(El.prototype);
    expect(setup.mock.calls[0][1]).toBe("connect");
    expect(setup.mock.calls[0][2]).toBe("ws://localhost");
    expect(setup.mock.calls[0][3]).toBe(3);
  });

  it("runs connect function on connectedCallback", () => {
    const connectFn = vi.fn();
    const myDec = createDecorator((_proto, _key) => {
      return connectFn;  // connect function
    });
    const tag = nextTag();

    class El extends LoomElement {}
    myDec()(El.prototype, "handler");
    customElements.define(tag, El);

    expect(connectFn).not.toHaveBeenCalled();

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(connectFn).toHaveBeenCalledOnce();
    expect(connectFn).toHaveBeenCalledWith(el);
  });

  it("tracks cleanup function for disconnect", () => {
    const cleanup = vi.fn();
    const myDec = createDecorator((_proto, _key) => {
      return (_el: any) => cleanup;  // connect returns cleanup
    });
    const tag = nextTag();

    class El extends LoomElement {}
    myDec()(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(cleanup).not.toHaveBeenCalled();

    document.body.removeChild(el);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("does not break if setup returns void (define-time only)", () => {
    const myDec = createDecorator((_proto, _key) => { /* no connect */ });
    const tag = nextTag();

    class El extends LoomElement {}
    myDec()(El.prototype, "handler");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    expect(() => {
      document.body.appendChild(el);
      document.body.removeChild(el);
    }).not.toThrow();
  });

  it("supports class decorators with { class: true }", () => {
    const setup = vi.fn();
    const myDec = createDecorator<[tag: string]>(setup, { class: true });

    class El extends LoomElement {}
    myDec("my-widget")(El);

    expect(setup).toHaveBeenCalledOnce();
    expect(setup).toHaveBeenCalledWith(El, "my-widget");
  });

  it("works with typed element generic", () => {
    interface MyApi { fetchData(): void }
    const connectFn = vi.fn();
    const myDec = createDecorator<[], MyApi>((_proto, _key) => {
      return connectFn;
    });
    const tag = nextTag();

    class El extends LoomElement {
      fetchData() {}
    }
    myDec()(El.prototype, "fetchData");
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    expect(connectFn).toHaveBeenCalledOnce();
  });
});
