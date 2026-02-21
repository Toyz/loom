/**
 * @toyz/loom-flags — Test Suite
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LoomElement, app, bus } from "@toyz/loom";
import { FlagProvider, flag, FlagChanged } from "@toyz/loom-flags";
import { MockFlags } from "@toyz/loom-flags/testing";

let tagId = 0;
const nextTag = () => `test-flags-${++tagId}`;

const flags = new MockFlags();

beforeEach(() => {
  flags.reset();
  app.use(FlagProvider, flags);
});

// ── MockFlags ──

describe("MockFlags", () => {
  it("defaults to disabled", () => {
    expect(flags.isEnabled("anything")).toBe(false);
  });

  it("enable / disable", () => {
    flags.enable("feat");
    expect(flags.isEnabled("feat")).toBe(true);
    flags.disable("feat");
    expect(flags.isEnabled("feat")).toBe(false);
  });

  it("tracks checked flags", () => {
    flags.isEnabled("a");
    flags.isEnabled("b");
    flags.assertChecked("a");
    flags.assertChecked("b");
  });

  it("assertNotChecked throws when checked", () => {
    flags.isEnabled("x");
    expect(() => flags.assertNotChecked("x")).toThrow();
  });

  it("assertEnabled / assertDisabled", () => {
    flags.enable("on");
    flags.assertEnabled("on");
    flags.assertDisabled("off");
    expect(() => flags.assertEnabled("off")).toThrow();
    expect(() => flags.assertDisabled("on")).toThrow();
  });

  it("variants", () => {
    flags.setVariant("checkout", "variant-b");
    expect(flags.getVariant("checkout", "control")).toBe("variant-b");
    expect(flags.getVariant("unknown", "fallback")).toBe("fallback");
  });

  it("reset clears everything", () => {
    flags.enable("a");
    flags.setVariant("b", "v2");
    flags.isEnabled("c");
    flags.reset();
    expect(flags.isEnabled("a")).toBe(false);
    expect(flags.getVariant("b", "default")).toBe("default");
    expect(flags.checked).toHaveLength(2); // the two calls above
  });
});

// ── @flag on class ──

describe("@flag on class", () => {
  it("sets flagEnabled = true when flag is on", () => {
    const tag = nextTag();
    flags.enable("dash");

    @flag("dash")
    class El extends LoomElement {}
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(el.flagEnabled).toBe(true);
    expect(el.flagName).toBe("dash");
  });

  it("sets flagEnabled = false when flag is off", () => {
    const tag = nextTag();

    @flag("missing")
    class El extends LoomElement {}
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(el.flagEnabled).toBe(false);
  });

  it("reacts to FlagChanged bus events", () => {
    const tag = nextTag();

    @flag("live")
    class El extends LoomElement {}
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(el.flagEnabled).toBe(false);

    // Simulate real-time flag update
    flags.enable("live");
    expect(el.flagEnabled).toBe(true);

    flags.disable("live");
    expect(el.flagEnabled).toBe(false);
  });

  it("supports dynamic context fn", () => {
    const tag = nextTag();
    let capturedCtx: any = null;

    // Custom provider that captures context
    class CapturingProvider extends FlagProvider {
      isEnabled(f: string, ctx?: Record<string, any>): boolean {
        capturedCtx = ctx;
        return true;
      }
      getVariant<T = string>(_f: string, fb: T): T { return fb; }
    }

    const provider = new CapturingProvider();
    app.use(FlagProvider, provider);

    @flag("ctx-test", (el: any) => ({ tag: el.tagName.toLowerCase() }))
    class El extends LoomElement {}
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(capturedCtx).toEqual({ tag });
  });
});

// ── @flag on method ──

describe("@flag on method", () => {
  it("executes when flag is on", () => {
    const tag = nextTag();
    flags.enable("export");
    let called = false;

    class El extends LoomElement {
      @flag("export")
      doExport() { called = true; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.doExport();

    expect(called).toBe(true);
  });

  it("no-ops when flag is off", () => {
    const tag = nextTag();
    let called = false;

    class El extends LoomElement {
      @flag("export")
      doExport() { called = true; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.doExport();

    expect(called).toBe(false);
  });

  it("reacts to flag changes for subsequent calls", () => {
    const tag = nextTag();
    let callCount = 0;

    class El extends LoomElement {
      @flag("toggle")
      doAction() { callCount++; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.doAction(); // flag off — no-op
    expect(callCount).toBe(0);

    flags.enable("toggle");
    el.doAction(); // flag on — executes
    expect(callCount).toBe(1);

    flags.disable("toggle");
    el.doAction(); // flag off again — no-op
    expect(callCount).toBe(1);
  });
});

// ── DI Integration ──

describe("DI integration", () => {
  it("MockFlags can be provided via app.use", () => {
    const transport = new MockFlags();
    app.use(FlagProvider, transport);
    const resolved = app.get(FlagProvider);
    expect(resolved).toBe(transport);
    expect(resolved).toBeInstanceOf(MockFlags);
  });
});

// ── FlagChanged Event ──

describe("FlagChanged event", () => {
  it("carries flag name and enabled state", () => {
    const event = new FlagChanged("feat", true);
    expect(event.flag).toBe("feat");
    expect(event.enabled).toBe(true);
    expect(event.timestamp).toBeDefined();
  });

  it("carries optional variant", () => {
    const event = new FlagChanged("feat", true, "variant-a");
    expect(event.variant).toBe("variant-a");
  });

  it("provider.set fires event on bus", () => {
    let received: FlagChanged | null = null;
    const handler = (e: FlagChanged) => { received = e; };
    bus.on(FlagChanged, handler);

    flags.enable("bus-test");

    expect(received).not.toBeNull();
    expect(received!.flag).toBe("bus-test");
    expect(received!.enabled).toBe(true);

    bus.off(FlagChanged, handler);
  });
});
