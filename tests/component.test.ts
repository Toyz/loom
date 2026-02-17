/**
 * Tests: @component — custom element registration, observedAttributes, attributeChangedCallback
 *
 * Note: @component calls app.register() which queues for app.start().
 * For tests, we call customElements.define() directly and test the
 * decorator's attribute wiring separately.
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { prop } from "../src/store/decorators";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-comp-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@component", () => {
  it("wires observedAttributes from @prop fields", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor label = "";
      @prop accessor count = 0;
    }

    expect((El as any).observedAttributes).toContain("label");
    expect((El as any).observedAttributes).toContain("count");
  });

  it("sets __loom_tag on the constructor", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {}
    expect((El as any).__loom_tag).toBe(tag);
  });

  it("auto-parses number attributes via attributeChangedCallback", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor count = 0;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("count", "42");
    expect(el.count).toBe(42);
  });

  it("auto-parses boolean attributes via attributeChangedCallback", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor disabled = false;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("disabled", "true");
    expect(el.disabled).toBe(true);

    el.setAttribute("disabled", "false");
    expect(el.disabled).toBe(false);
  });

  it("auto-parses string attributes via attributeChangedCallback", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor label = "";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("label", "Hello");
    expect(el.label).toBe("Hello");
  });

  it("mounts from fixtureHTML with pre-set attributes", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor label = "";
      @prop accessor count = 0;
    }
    customElements.define(tag, El);

    const { fixtureHTML } = await import("../src/testing");
    const el = await fixtureHTML<El>(`<${tag} label="World" count="7"></${tag}>`);
    expect(el.label).toBe("World");
    expect(el.count).toBe(7);
  });
});
