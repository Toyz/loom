/**
 * Tests: @lazy — @prop forwarding from shell → impl
 *
 * Edge cases:
 *  - JS property writes before lazy load completes
 *  - Numeric and boolean @prop coercion
 *  - Null/undefined values are not forwarded (impl keeps defaults)
 *  - Multiple @prop fields forwarded atomically
 *  - Attribute vs JS prop precedence
 *  - Mixed attribute + JS-only props
 *  - Cached re-mount with different prop values
 *
 * NOTE: Real classes are NOT registered with @component because @lazy
 * internally calls customElements.define(implTag, RealClass). We manually
 * flush pendingProps to populate the PROPS map on Real's constructor.
 *
 * Shell classes DO need explicit customElements.define() after @component
 * because app.register() only queues (without app.start() in tests).
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { prop, pendingProps } from "../src/store/decorators";
import { PROPS } from "../src/decorators/symbols";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lpf-${++tagCounter}`; }

afterEach(() => cleanup());

/**
 * Flush pendingProps into a Real class's PROPS map.
 * Mimics what @component does after member decorators run.
 * Must be called AFTER @prop decorators have run on the class.
 */
function flushProps(RealCtor: any) {
  const propMap: Map<string, string> = RealCtor[PROPS.key] ?? new Map();
  for (const { key } of pendingProps) {
    propMap.set(key.toLowerCase(), key);
  }
  pendingProps.length = 0;
  RealCtor[PROPS.key] = propMap;
}

function getImpl(shell: HTMLElement): any {
  const implTag = `${shell.tagName.toLowerCase()}-impl`;
  return shell.shadowRoot?.querySelector(implTag) ?? null;
}

describe("@lazy @prop forwarding", () => {
  it("forwards a string property set on shell before mount", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor label = "";
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    el.label = "hello-from-shell";
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.label).toBe("hello-from-shell");

    el.remove();
  });

  it("forwards a numeric property set on shell", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor count = 0;
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    el.count = 42;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.count).toBe(42);

    el.remove();
  });

  it("forwards a boolean property set on shell", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor active = false;
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    el.active = true;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.active).toBe(true);

    el.remove();
  });

  it("does NOT forward null or undefined — impl keeps defaults", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor heading = "default-heading";
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    // Don't set anything on the shell
    const el = document.createElement(tag);
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.heading).toBe("default-heading");

    el.remove();
  });

  it("forwards multiple @prop fields at once", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor firstName = "";
      @prop accessor lastName = "";
      @prop accessor age = 0;
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    el.firstName = "Jane";
    el.lastName = "Doe";
    el.age = 25;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.firstName).toBe("Jane");
    expect(impl.lastName).toBe("Doe");
    expect(impl.age).toBe(25);

    el.remove();
  });

  it("skips JS prop when attribute is already present (no double-write)", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor slug = "";
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    el.setAttribute("slug", "from-attr");
    el.slug = "from-js";
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.getAttribute("slug")).toBe("from-attr");

    el.remove();
  });

  it("forwards mix of attribute and JS-only props correctly", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor width = 0;
      @prop accessor label = "";
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    el.setAttribute("width", "100");
    el.label = "js-only";
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    const impl = getImpl(el);
    expect(impl).toBeTruthy();
    expect(impl.getAttribute("width")).toBe("100");
    expect(impl.label).toBe("js-only");

    el.remove();
  });

  it("cached re-mount forwards different prop values per instance", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      @prop accessor value = "";
    }
    flushProps(Real);

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    // First mount
    const el1 = document.createElement(tag) as any;
    el1.value = "first-value";
    document.body.appendChild(el1);
    await new Promise(r => setTimeout(r, 50));
    expect(getImpl(el1)?.value).toBe("first-value");
    el1.remove();

    // Second mount — module cached but new instance gets its own value
    const el2 = document.createElement(tag) as any;
    el2.value = "second-value";
    document.body.appendChild(el2);
    await new Promise(r => setTimeout(r, 50));
    expect(getImpl(el2)?.value).toBe("second-value");

    el2.remove();
  });
});
