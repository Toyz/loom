/**
 * Tests: @on, @emit, event bus integration (TC39 Stage 3)
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { LoomEvent } from "../src/event";
import { bus } from "../src/bus";
import { on, emit } from "../src/decorators/events";
import { fixture, cleanup } from "../src/testing";

class CountUpdated extends LoomEvent {
  constructor(public count: number) { super(); }
}

let tagCounter = 0;
function nextTag() { return `test-events-${++tagCounter}`; }

beforeEach(() => bus.reset());
afterEach(() => cleanup());

describe("@on", () => {
  it("subscribes to bus events on connect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @on(CountUpdated)
      onCountUpdated(ev: CountUpdated) { fn(ev.count); }
    }

    customElements.define(tag, El);

    await fixture<El>(tag);

    bus.emit(new CountUpdated(42));
    expect(fn).toHaveBeenCalledWith(42);
  });

  it("unsubscribes on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @on(CountUpdated)
      onCountUpdated(ev: CountUpdated) { fn(ev.count); }
    }

    customElements.define(tag, El);

    await fixture<El>(tag);
    cleanup(); // triggers disconnectedCallback

    bus.emit(new CountUpdated(99));
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("@emit (method)", () => {
  it("emits return value to bus when method is called", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @emit()
      doThing(): CountUpdated {
        return new CountUpdated(7);
      }
    }

    customElements.define(tag, El);

    bus.on(CountUpdated, fn);
    const el = await fixture<El>(tag);

    (el as any).doThing();
    expect(fn).toHaveBeenCalledOnce();
    expect(fn.mock.calls[0][0]).toBeInstanceOf(CountUpdated);
    expect(fn.mock.calls[0][0].count).toBe(7);
  });
});

describe("@on (resolver)", () => {
  it("lazily resolves target via callback and subscribes", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @on((el: any) => el.shadowRoot!, "custom-event")
      onShadowEvent(e: Event) { fn((e as CustomEvent).detail); }
    }

    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    el.shadowRoot!.dispatchEvent(new CustomEvent("custom-event", { detail: "hello" }));
    expect(fn).toHaveBeenCalledWith("hello");
  });

  it("cleans up resolver-bound listeners on disconnect", async () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @on((el: any) => el.shadowRoot!, "custom-event")
      onShadowEvent(e: Event) { fn(); }
    }

    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    cleanup(); // triggers disconnectedCallback

    el.shadowRoot!.dispatchEvent(new CustomEvent("custom-event"));
    expect(fn).not.toHaveBeenCalled();
  });
});
