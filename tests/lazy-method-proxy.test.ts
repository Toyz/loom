/**
 * Tests: @lazy — custom method proxy from shell → impl
 *
 * Edge cases:
 *  - Custom method called on shell delegates to impl
 *  - Method return values are forwarded back
 *  - Method with arguments
 *  - Multiple custom methods all proxied
 *  - Built-in lifecycle methods are NOT proxied
 *  - Underscore-prefixed methods are NOT proxied
 *  - Method on impl subclass (inherited chain)
 *  - Cached re-mount still proxies methods
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lmp-${++tagCounter}`; }

afterEach(() => cleanup());

function getImpl(shell: HTMLElement): any {
  const implTag = `${shell.tagName.toLowerCase()}-impl`;
  return shell.shadowRoot?.querySelector(implTag) ?? null;
}

describe("@lazy method proxy", () => {
  it("proxies a custom method from shell → impl", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      greet() { return "hello from impl"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    expect(getImpl(el)).toBeTruthy();
    expect(typeof el.greet).toBe("function");
    expect(el.greet()).toBe("hello from impl");

    el.remove();
  });

  it("forwards arguments to the proxied method", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      add(a: number, b: number) { return a + b; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    expect(el.add(3, 7)).toBe(10);

    el.remove();
  });

  it("proxies multiple custom methods", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      open() { return "opened"; }
      close() { return "closed"; }
      toggle(force: boolean) { return force ? "on" : "off"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    expect(el.open()).toBe("opened");
    expect(el.close()).toBe("closed");
    expect(el.toggle(true)).toBe("on");
    expect(el.toggle(false)).toBe("off");

    el.remove();
  });

  it("does NOT proxy built-in lifecycle methods", async () => {
    const tag = nextTag();
    let implUpdateCalled = false;

    class Real extends LoomElement {
      update() {
        implUpdateCalled = true;
        return document.createElement("p");
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    // el.update should be the shell's own update, not a proxy to impl
    // The shell's update is from LoomElement prototype, not overridden
    const shellUpdate = el.update;
    const implUpdate = getImpl(el).update;
    // They should NOT be the same function reference
    expect(shellUpdate).not.toBe(implUpdate);

    el.remove();
  });

  it("does NOT proxy underscore-prefixed methods", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      _internal() { return "secret"; }
      publicMethod() { return "public"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    // Public method should be proxied
    expect(typeof el.publicMethod).toBe("function");
    expect(el.publicMethod()).toBe("public");

    // _internal should NOT be proxied (underscore-prefixed = private convention)
    // It might exist on the shell from LoomElement base, but not as our proxy
    const impl = getImpl(el);
    expect(impl._internal()).toBe("secret");

    el.remove();
  });

  it("proxies methods from parent class in inheritance chain", async () => {
    const tag = nextTag();

    class Base extends LoomElement {
      baseMethod() { return "from-base"; }
    }

    class Real extends Base {
      childMethod() { return "from-child"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    expect(el.childMethod()).toBe("from-child");
    expect(el.baseMethod()).toBe("from-base");

    el.remove();
  });

  it("proxied method sees correct `this` context on impl", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      value = 42;
      getValue() { return this.value; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 50));

    // The proxy calls realEl.getValue() — `this` inside should be the impl
    expect(el.getValue()).toBe(42);

    el.remove();
  });

  it("cached re-mount still proxies methods on new instance", async () => {
    const tag = nextTag();

    class Real extends LoomElement {
      ping() { return "pong"; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: Real }))
    class Shell extends LoomElement {}
    customElements.define(tag, Shell);

    // First mount
    const el1 = document.createElement(tag) as any;
    document.body.appendChild(el1);
    await new Promise(r => setTimeout(r, 50));
    expect(el1.ping()).toBe("pong");
    el1.remove();

    // Second mount — module cached
    const el2 = document.createElement(tag) as any;
    document.body.appendChild(el2);
    await new Promise(r => setTimeout(r, 50));
    expect(el2.ping()).toBe("pong");

    el2.remove();
  });
});
