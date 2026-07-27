/**
 * ElementInternals: form association, :state(), ARIA reflection.
 *
 * happy-dom implements none of attachInternals, so these install a
 * spec-shaped fake and assert Loom drives it correctly. That is the right unit
 * to test either way -- the browser's implementation is not ours, the adapter
 * is -- and the last block covers the case that actually ships to older Safari
 * and to any test DOM: no internals at all, and the component must still work.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LoomElement, component, reactive } from "../src/index";
import {
  state, aria, setState, hasState, internalsFor, supportsInternals, setAria,
} from "../src/element/internals";
import {
  formValue, validity, revalidate, makeFormAssociated,
  checkValidity, validationMessage,
} from "../src/element/form-associated";

// ── A fake matching the shape of the spec's ElementInternals ──

class FakeInternals {
  states = new Set<string>();
  value: unknown = undefined;
  flags: Record<string, boolean> = {};
  message = "";
  role: string | null = null;
  ariaChecked: string | null = null;
  ariaLabel: string | null = null;

  setFormValue(v: unknown) { this.value = v; }
  setValidity(flags: Record<string, boolean> = {}, message = "") {
    this.flags = flags;
    this.message = message;
  }
  checkValidity() { return !Object.values(this.flags).some(Boolean); }
  reportValidity() { return this.checkValidity(); }
  get validationMessage() { return this.message; }
}

const attached = new WeakMap<object, FakeInternals>();

function installInternals() {
  (HTMLElement.prototype as any).attachInternals = function (this: HTMLElement) {
    if (attached.has(this)) throw new Error("already attached"); // matches the spec
    const i = new FakeInternals();
    attached.set(this, i);
    return i;
  };
}

function removeInternals() {
  delete (HTMLElement.prototype as any).attachInternals;
}

let tag = 0;
const nextTag = () => `internals-el-${++tag}`;

/** Define and mount a component, returning the live element. */
async function mount<T extends HTMLElement>(name: string): Promise<T> {
  const el = document.createElement(name) as T;
  document.body.appendChild(el);
  await (el as any).updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("internalsFor", () => {
  beforeEach(installInternals);
  afterEach(removeInternals);

  it("attaches once and caches, because a second call throws", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {}
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    const a = internalsFor(el);
    const b = internalsFor(el);
    expect(a).toBeTruthy();
    expect(b).toBe(a); // the spec throws on a second attachInternals
  });

  it("reports support", () => {
    expect(supportsInternals()).toBe(true);
  });
});

describe(":state()", () => {
  beforeEach(installInternals);
  afterEach(removeInternals);

  it("mirrors a boolean accessor into a custom state", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @state accessor loading = false;
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect(hasState(el, "loading")).toBe(false);

    el.loading = true;
    expect(hasState(el, "loading")).toBe(true);

    el.loading = false;
    expect(hasState(el, "loading")).toBe(false);
  });

  it("applies an initial true value on connect", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @state accessor busy = true;
    }
    customElements.define(t + "-x", class extends El {});

    // Without the connect hook this would only take effect on first write, so
    // a component that starts in a state renders once without it.
    const el = await mount<any>(t + "-x");
    expect(hasState(el, "busy")).toBe(true);
  });

  it("takes an explicit name and coerces non-booleans", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @state("has-error") accessor error: string | null = null;
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect(hasState(el, "has-error")).toBe(false);

    el.error = "boom";
    expect(hasState(el, "has-error")).toBe(true);
    expect(hasState(el, "error")).toBe(false); // the declared name, not the field
  });

  it("setState/hasState work directly on an element", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {}
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    setState(el, "open", true);
    expect(hasState(el, "open")).toBe(true);
    setState(el, "open", false);
    expect(hasState(el, "open")).toBe(false);
  });
});

describe("@aria", () => {
  beforeEach(installInternals);
  afterEach(removeInternals);

  it("sets a default role without touching host attributes", async () => {
    const t = nextTag();
    @component(t)
    @aria({ role: "switch", ariaChecked: "false" })
    class El extends LoomElement {}
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    const i = internalsFor(el) as any;
    expect(i.role).toBe("switch");
    expect(i.ariaChecked).toBe("false");
    // The point of internals: semantics without polluting the markup.
    expect(el.getAttribute("role")).toBeNull();
    expect(el.getAttribute("aria-checked")).toBeNull();
  });

  it("setAria updates a property at runtime", async () => {
    const t = nextTag();
    @component(t)
    @aria({ role: "switch" })
    class El extends LoomElement {}
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    setAria(el, "ariaChecked", "true");
    expect((internalsFor(el) as any).ariaChecked).toBe("true");
  });
});

describe("form association", () => {
  beforeEach(installInternals);
  afterEach(removeInternals);

  it("marks the constructor formAssociated before define", () => {
    class El extends LoomElement {}
    makeFormAssociated(El);
    // The browser latches this at customElements.define; setting it later is
    // silently ignored, which is the whole reason @component takes the option.
    expect((El as any).formAssociated).toBe(true);
  });

  it("submits the accessor's value through setFormValue", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @formValue accessor value = "";
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect((internalsFor(el) as any).value).toBe("");

    el.value = "hello";
    expect((internalsFor(el) as any).value).toBe("hello");
  });

  it("uses checkbox semantics for booleans", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @formValue accessor checked = false;
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect((internalsFor(el) as any).value).toBe(null);

    el.checked = true;
    expect((internalsFor(el) as any).value).toBe("on");
  });

  it("reports a failing validator through setValidity", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @validity((v: string) => v.includes("@") || "Enter an email address")
      @formValue
      accessor email = "";
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect(checkValidity(el)).toBe(false);
    expect(validationMessage(el)).toBe("Enter an email address");

    el.email = "a@b.com";
    expect(checkValidity(el)).toBe(true);
    expect(validationMessage(el)).toBe("");
  });

  it("reports the first failure when several validators are declared", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @validity((v: string) => v.length >= 3 || "Too short")
      accessor a = "";
      @validity((v: string) => v.length >= 3 || "Also too short")
      accessor b = "abc";
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect(validationMessage(el)).toBe("Too short");

    el.a = "abc";
    expect(checkValidity(el)).toBe(true);
  });

  it("treats a throwing validator as a failure rather than crashing the set", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @validity(() => { throw new Error("validator blew up"); })
      accessor x = "";
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect(checkValidity(el)).toBe(false);
    expect(validationMessage(el)).toBe("validator blew up");
  });

  it("formResetCallback restores the constructed value", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @formValue accessor value = "initial";
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    el.value = "typed";
    expect(el.value).toBe("typed");

    el.formResetCallback();
    expect(el.value).toBe("initial");
    expect((internalsFor(el) as any).value).toBe("initial");
  });

  it("formStateRestoreCallback writes the restored value back", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {
      @formValue accessor value = "";
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    el.formStateRestoreCallback("from-bfcache");
    expect(el.value).toBe("from-bfcache");
  });

  it("formDisabledCallback reflects a wrapping fieldset's disabled state", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class El extends LoomElement {}
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    el.formDisabledCallback(true);
    expect(el.getAttribute("aria-disabled")).toBe("true");
    el.formDisabledCallback(false);
    expect(el.getAttribute("aria-disabled")).toBeNull();
  });

  it("keeps validator lists per subclass", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    class Base extends LoomElement {
      @validity((v: string) => v === "ok" || "base failed")
      accessor a = "ok";
    }
    class Child extends Base {
      @validity((v: string) => v === "ok" || "child failed")
      accessor b = "nope";
    }
    customElements.define(t + "-base", class extends Base {});
    customElements.define(t + "-child", class extends Child {});

    const child = await mount<any>(t + "-child");
    expect(validationMessage(child)).toBe("child failed");

    // The sibling must not have inherited the child's validator -- the bug
    // that shared metadata through the static prototype chain would produce.
    const base = await mount<any>(t + "-base");
    expect(checkValidity(base)).toBe(true);
  });
});

describe("without ElementInternals", () => {
  // No installInternals here: this is older Safari, and every test DOM.
  it("reports no support", () => {
    expect(supportsInternals()).toBe(false);
  });

  it("a component using every feature still renders and stays usable", async () => {
    const t = nextTag();
    @component(t, { formAssociated: true })
    @aria({ role: "switch" })
    class El extends LoomElement {
      @reactive accessor count = 0;
      @state accessor loading = false;
      @formValue accessor value = "start";
      @validity((v: string) => v.length > 0 || "Required")
      accessor name = "";

      update() {
        return <span>{String(this.count)}</span>;
      }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount<any>(t + "-x");
    expect(el.shadowRoot?.textContent).toBe("0");

    el.count = 5;
    await el.updateComplete;
    expect(el.shadowRoot?.textContent).toBe("5");

    // The state features degrade to no-ops rather than throwing.
    el.loading = true;
    expect(hasState(el, "loading")).toBe(false);
    el.value = "changed";
    expect(el.value).toBe("changed");
    expect(() => revalidate(el)).not.toThrow();
    expect(checkValidity(el)).toBe(true); // nothing to validate against
  });
});
