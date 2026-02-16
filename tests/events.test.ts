/**
 * Tests: @on, @emit, event bus integration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { LoomEvent } from "../src/event";
import { bus } from "../src/bus";
import { on, emit } from "../src/decorators/events";

class CountUpdated extends LoomEvent {
  constructor(public count: number) { super(); }
}

let tagCounter = 0;
function nextTag() { return `test-events-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
  bus.reset();
});

describe("@on", () => {
  it("subscribes to bus events on connect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      onCountUpdated(ev: CountUpdated) { fn(ev.count); }
    }

    // Apply @on(CountUpdated) directly — self-wires connectedCallback
    on(CountUpdated)(El.prototype, "onCountUpdated");

    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    bus.emit(new CountUpdated(42));
    expect(fn).toHaveBeenCalledWith(42);
  });

  it("unsubscribes on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      onCountUpdated(ev: CountUpdated) { fn(ev.count); }
    }

    on(CountUpdated)(El.prototype, "onCountUpdated");

    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    document.body.removeChild(el);

    bus.emit(new CountUpdated(99));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("@emit (method)", () => {
  it("emits return value to bus when method is called", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      doThing(): CountUpdated {
        return new CountUpdated(7);
      }
    }
    // Apply @emit() to the method via descriptor
    const desc = Object.getOwnPropertyDescriptor(El.prototype, "doThing")!;
    emit()(El.prototype, "doThing", desc);
    Object.defineProperty(El.prototype, "doThing", desc);

    customElements.define(tag, El);

    bus.on(CountUpdated, fn);
    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.doThing();
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0]).toBeInstanceOf(CountUpdated);
    expect(fn.mock.calls[0][0].count).toBe(7);
  });
});
