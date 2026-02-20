/**
 * Tests: @readonly decorator (TC39 Stage 3)
 *
 * Covers:
 *  - Init value allowed
 *  - Subsequent sets throw
 *  - Object values are frozen (push/mutate throws)
 *  - Primitives pass through without freeze overhead
 *  - Stacks with @reactive
 *  - Stacks with @prop
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { reactive, prop } from "../src/store";
import { readonly } from "../src/store/readonly";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-readonly-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@readonly (standalone)", () => {
  it("allows init value", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly accessor name = "hello";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.name).toBe("hello");
  });

  it("throws on subsequent set", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly accessor name = "hello";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    // First explicit set is allowed (triggers lock)
    el.name = "world";
    expect(el.name).toBe("world");

    // Second set should throw
    expect(() => { el.name = "nope"; }).toThrow("Cannot mutate readonly property 'name'");
  });

  it("freezes object values", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly accessor items: string[] = ["a", "b"];
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    const arr = el.items;
    expect(Object.isFrozen(arr)).toBe(true);
    expect(() => { arr.push("c"); }).toThrow();
  });

  it("primitives are not frozen", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly accessor count = 42;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.count).toBe(42);
  });
});

describe("@readonly + @reactive", () => {
  it("allows first set then locks", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly @reactive accessor id = "initial";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.id).toBe("initial");

    // First set goes through
    el.id = "locked-now";
    expect(el.id).toBe("locked-now");

    // Second set throws
    expect(() => { el.id = "nope"; }).toThrow("Cannot mutate readonly property 'id'");
  });
});

describe("@readonly + @prop", () => {
  it("allows first attribute-driven set then locks", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly @prop accessor label = "default";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.label).toBe("default");

    // First set via prop goes through
    el.label = "set-once";
    expect(el.label).toBe("set-once");

    // Subsequent internal set throws
    expect(() => { el.label = "nope"; }).toThrow("Cannot mutate readonly property 'label'");
  });
});
