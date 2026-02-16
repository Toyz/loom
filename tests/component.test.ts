/**
 * Tests: @component — custom element registration, observedAttributes, attributeChangedCallback
 *
 * Note: @component calls app.register() which queues for app.start().
 * For tests, we call customElements.define() directly and test the
 * decorator's attribute wiring separately.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { prop } from "../src/store/decorators";
import { PROPS } from "../src/decorators/symbols";

let tagCounter = 0;
function nextTag() { return `test-comp-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("@component", () => {
  it("wires observedAttributes from @prop fields", () => {
    const tag = nextTag();

    class El extends LoomElement {
      label = "";
      count = 0;
    }
    prop(El.prototype, "label");
    prop(El.prototype, "count");
    component(tag)(El);

    expect((El as any).observedAttributes).toContain("label");
    expect((El as any).observedAttributes).toContain("count");
  });

  it("sets __loom_tag on the constructor", () => {
    const tag = nextTag();

    class El extends LoomElement {}
    component(tag)(El);
    expect((El as any).__loom_tag).toBe(tag);
  });

  it("auto-parses number attributes via attributeChangedCallback", () => {
    const tag = nextTag();

    class El extends LoomElement {
      count = 0;
    }
    prop(El.prototype, "count");
    component(tag)(El);

    // Manually define to avoid app.start() dependency
    customElements.define(tag, El);
    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.setAttribute("count", "42");
    expect(el.count).toBe(42);
  });

  it("auto-parses boolean attributes via attributeChangedCallback", () => {
    const tag = nextTag();

    class El extends LoomElement {
      disabled = false;
    }
    prop(El.prototype, "disabled");
    component(tag)(El);

    customElements.define(tag, El);
    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.setAttribute("disabled", "true");
    expect(el.disabled).toBe(true);

    el.setAttribute("disabled", "false");
    expect(el.disabled).toBe(false);
  });

  it("auto-parses string attributes via attributeChangedCallback", () => {
    const tag = nextTag();

    class El extends LoomElement {
      label = "";
    }
    prop(El.prototype, "label");
    component(tag)(El);

    customElements.define(tag, El);
    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.setAttribute("label", "Hello");
    expect(el.label).toBe("Hello");
  });
});
