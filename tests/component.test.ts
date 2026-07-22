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

  it("resets @prop when its attribute is removed (boolean true -> false)", async () => {
    // Regression: JSX renders boolean `false` as an ABSENT attribute, so morph
    // removes it (attributeChangedCallback val === null). The old guard skipped
    // null, freezing the @prop getter at the stale `true` while the DOM attribute
    // was already gone — visible on slotted children re-rendered via morph.
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @prop accessor disabled = false;
      @prop accessor count = 3;
      @prop accessor label = "hi";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("disabled", "");
    expect(el.disabled).toBe(true);

    el.removeAttribute("disabled");
    expect(el.disabled).toBe(false); // was frozen at true before the fix

    // Non-boolean props reset to their type's empty on removal.
    el.setAttribute("count", "9");
    expect(el.count).toBe(9);
    el.removeAttribute("count");
    expect(el.count).toBe(0);

    el.setAttribute("label", "yo");
    expect(el.label).toBe("yo");
    el.removeAttribute("label");
    expect(el.label).toBe("");
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
