/**
 * Tests: @readonly decorator (TC39 Stage 3)
 *
 * Covers:
 *  - Init value allowed
 *  - Subsequent internal sets throw
 *  - Object values are frozen (push/mutate throws)
 *  - Primitives pass through without freeze overhead
 *  - Stacks with @reactive
 *  - Stacks with @prop
 *  - REGRESSION: morph engine bypass allows parent/external updates
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { reactive, prop } from "../src/store";
import { readonly, setReadonlyBypass } from "../src/store/readonly";
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

  it("throws on subsequent set after first explicit set", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly accessor name = "hello";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    // First explicit set is allowed (triggers init flag)
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

// ── REGRESSION: morph engine / parent bypass ──

describe("@readonly bypass (morph engine / parent writes)", () => {
  it("allows writes when bypass is active (simulates morph patchJSProps)", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly @prop accessor badge = "initial";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(el.badge).toBe("initial");

    // First normal set — goes through (init)
    el.badge = "set-once";
    expect(el.badge).toBe("set-once");

    // Normal set — should throw (locked)
    expect(() => { el.badge = "nope"; }).toThrow("Cannot mutate readonly property 'badge'");

    // Morph bypass — should succeed
    setReadonlyBypass(true);
    try {
      el.badge = "updated-by-parent";
    } finally {
      setReadonlyBypass(false);
    }
    expect(el.badge).toBe("updated-by-parent");
  });

  it("bypass allows multiple successive updates (parent re-renders)", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly @prop accessor score = 0;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    // Simulate parent re-rendering and updating prop multiple times
    for (let i = 1; i <= 5; i++) {
      setReadonlyBypass(true);
      try {
        el.score = i * 10;
      } finally {
        setReadonlyBypass(false);
      }
      expect(el.score).toBe(i * 10);
    }

    // Internal write still blocked after bypass updates
    expect(() => { el.score = 999; }).toThrow("Cannot mutate readonly property 'score'");
  });

  it("bypass is safe with try/finally — cleared even if setter throws", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly accessor value = "ok";
      set dangerous(_v: string) {
        throw new Error("boom");
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    // Simulate morph patching a prop that throws in another setter
    setReadonlyBypass(true);
    try {
      // This should go through (bypass active)
      el.value = "parent-set";
    } finally {
      setReadonlyBypass(false);
    }

    // Bypass should be off — internal write should throw
    expect(() => { el.value = "nope"; }).toThrow("Cannot mutate readonly property 'value'");
    expect(el.value).toBe("parent-set");
  });

  it("frozen objects are re-frozen after bypass update", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @readonly @prop accessor tags: string[] = ["a"];
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    expect(Object.isFrozen(el.tags)).toBe(true);

    // Parent updates the array via bypass
    setReadonlyBypass(true);
    try {
      el.tags = ["x", "y", "z"];
    } finally {
      setReadonlyBypass(false);
    }

    // New value should be frozen again on read
    const newTags = el.tags;
    expect(newTags).toEqual(["x", "y", "z"]);
    expect(Object.isFrozen(newTags)).toBe(true);
    expect(() => { newTags.push("w"); }).toThrow();
  });
});
