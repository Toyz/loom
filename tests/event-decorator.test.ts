/**
 * Tests: @event<T> accessor decorator (TC39 Stage 3)
 *
 * Covers:
 *  - Storing a callback via property setter
 *  - Retrieving the callback via getter
 *  - Default value is null
 *  - Reassigning callbacks
 *  - WeakMap isolation between instances
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { event } from "../src/element/events";
import { fixture, cleanup } from "../src/testing";

type DrawCallback = (ctx: any, dt: number, t: number) => void;

let tagCounter = 0;
function nextTag() { return `test-event-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@event<T> (accessor)", () => {
  it("defaults to null when no callback is set", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.draw).toBeNull();
  });

  it("stores and retrieves a callback", async () => {
    const tag = nextTag();
    const fn = vi.fn();

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.draw = fn;
    expect(el.draw).toBe(fn);
  });

  it("allows invoking the stored callback", async () => {
    const tag = nextTag();
    const fn = vi.fn();

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.draw = fn;
    el.draw?.({}, 16, 100);
    expect(fn).toHaveBeenCalledWith({}, 16, 100);
  });

  it("can reassign callback", async () => {
    const tag = nextTag();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.draw = fn1;
    el.draw?.({}, 0, 0);
    expect(fn1).toHaveBeenCalledOnce();

    el.draw = fn2;
    el.draw?.({}, 1, 1);
    expect(fn2).toHaveBeenCalledOnce();
    expect(fn1).toHaveBeenCalledOnce(); // fn1 not called again
  });

  it("can be set to null to remove callback", async () => {
    const tag = nextTag();
    const fn = vi.fn();

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.draw = fn;
    el.draw = null;
    expect(el.draw).toBeNull();
  });

  it("isolates state between instances via WeakMap", async () => {
    const tag = nextTag();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
    }
    customElements.define(tag, El);

    const el1 = await fixture<El>(tag);
    const el2 = document.createElement(tag) as El;
    document.body.appendChild(el2);

    el1.draw = fn1;
    el2.draw = fn2;

    expect(el1.draw).toBe(fn1);
    expect(el2.draw).toBe(fn2);

    el1.draw?.({}, 0, 0);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("supports multiple @event accessors on one class", async () => {
    const tag = nextTag();

    type TapCb = () => void;

    class El extends LoomElement {
      @event<DrawCallback>() accessor draw: DrawCallback | null = null;
      @event<TapCb>() accessor tap: TapCb | null = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    const drawFn = vi.fn();
    const tapFn = vi.fn();

    el.draw = drawFn;
    el.tap = tapFn;

    el.draw?.({}, 0, 0);
    el.tap?.();

    expect(drawFn).toHaveBeenCalledOnce();
    expect(tapFn).toHaveBeenCalledOnce();
  });
});
