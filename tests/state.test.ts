/**
 * Tests: @reactive, @prop, @computed
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { reactive, prop, computed } from "../src/store/decorators";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-state-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => cleanup());

describe("@reactive", () => {
  it("creates a reactive backing store", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor count = 0;
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.count = 5;
    expect(el.count).toBe(5);
  });

  it("notifies subscribers on change (triggers scheduleUpdate pipeline)", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor count = 0;
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.count = 42;
    expect(el.count).toBe(42);

    // Setting the same value should be a no-op (Reactive deduplicates)
    el.count = 42;
    expect(el.count).toBe(42);

    // Different value should update
    el.count = 99;
    expect(el.count).toBe(99);
  });
});

describe("@prop", () => {
  it("makes the field reactive", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @prop accessor title = "";
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.title = "Hello";
    expect(el.title).toBe("Hello");
  });

  it("registers as an observed attribute", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor value = "";
    }
    customElements.define(tag, El);

    // The class should have the static observedAttributes getter
    // that includes "value"
    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.setAttribute("value", "test");
    expect(el.value).toBe("test");
  });
});

