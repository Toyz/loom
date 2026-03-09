/**
 * Tests: @lazy combined decorator edge cases
 *
 * Tests the lazy shell/impl boundary with other decorators:
 *   - setAttribute forwarding via scheduleUpdate (outlet unbound-param fallback)
 *   - @onRouteEnter / @onRouteLeave lifecycle forwarding
 *   - @context ContextRequestEvent (composed:true crosses shadow boundary)
 *   - @on(BusEvent) on impl fires independently of shell
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy, LAZY_IMPL } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { prop, reactive } from "../src/store/decorators";
import { on } from "../src/decorators/events";
import { ContextRequestEvent } from "../src/element/context";
import { bus } from "../src/bus";
import { LoomEvent } from "../src/event";
import { ROUTE_PROPS, ROUTE_ENTER, ROUTE_LEAVE } from "../src/decorators/symbols";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-combo-${++tagCounter}`; }

const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));

afterEach(() => cleanup());

// ── setAttribute forwarding via scheduleUpdate ──

describe("@lazy + setAttribute forwarding (via scheduleUpdate)", () => {

  it("unbound params set via setAttribute are forwarded to impl on scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      _slug = "";
      get slug() { return this._slug; }
      set slug(v: string) { this._slug = v; }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    // Simulate outlet's unbound-param fallback: setAttribute then scheduleUpdate
    el.setAttribute("slug", "first-post");
    el.scheduleUpdate?.();
    await tick();

    // The impl should have "slug" as an attribute too (forwarded via scheduleUpdate)
    // since scheduleUpdate forwards shell attributes to impl via `attr.name in impl`
    // and impl has a "slug" getter
    expect(impl.slug).toBe("first-post");
  });

  it("setAttribute before impl mount carries through via __mountLazyImpl attribute copy", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {}

    let resolveLoader!: (v: any) => void;
    const loaderPromise = new Promise(r => { resolveLoader = r; });

    @component(tag)
    @lazy(() => loaderPromise)
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.setAttribute("data-id", "pre-load");
    document.body.appendChild(el);
    await tick();

    // Impl not loaded yet
    expect(el.shadowRoot!.querySelector(implTag)).toBeNull();

    // Resolve loader — impl mounts with attributes forwarded
    resolveLoader({ default: RealPage });
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag);
    expect(impl).toBeTruthy();
    expect(impl!.getAttribute("data-id")).toBe("pre-load");
  });

  it("setAttribute on re-navigation updates impl via scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "first-post";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.slug).toBe("first-post");

    // Simulate outlet re-navigation with bound params + scheduleUpdate
    el.slug = "second-post";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.slug).toBe("second-post");
  });

  it("multiple attributes set before scheduleUpdate — all forwarded", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "username" }) accessor username = "";
      @prop({ param: "slug" }) accessor slug = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "username" }) accessor username = "";
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.username = "@alice";
    el.slug = "post-1";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    el.username = "@bob";
    el.slug = "post-2";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.username).toBe("@bob");
    expect(impl.slug).toBe("post-2");
  });
});

// ── @onRouteEnter / @onRouteLeave forwarding ──

describe("@lazy + @onRouteEnter / @onRouteLeave", () => {

  it("ROUTE_ENTER metadata is copied from impl to shell after mount", async () => {
    const tag = nextTag();

    class RealPage extends LoomElement {
      entered = false;
      onEnter() { this.entered = true; }
    }
    ROUTE_ENTER.set(RealPage.prototype, ["onEnter"]);

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    // Shell should now have ROUTE_ENTER metadata
    const handlers = (ROUTE_ENTER.from(el) as string[] | undefined)
      ?? (ROUTE_ENTER.from(Object.getPrototypeOf(el) as object) as string[] | undefined);
    expect(handlers).toBeTruthy();
    expect(handlers).toContain("onEnter");
  });

  it("calling @onRouteEnter handler on shell delegates to impl", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      enteredParams: Record<string, string> = {};
      onEnter(params: Record<string, string>) {
        this.enteredParams = params;
      }
    }
    ROUTE_ENTER.set(RealPage.prototype, ["onEnter"]);

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // Simulate what the router does: call the handler on the shell
    el.onEnter({ username: "@bob", slug: "post-1" });

    expect(impl.enteredParams).toEqual({ username: "@bob", slug: "post-1" });
  });

  it("ROUTE_LEAVE handler on shell delegates to impl", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      left = false;
      onLeave() { this.left = true; }
    }
    ROUTE_LEAVE.set(RealPage.prototype, ["onLeave"]);

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    el.onLeave();
    expect(impl.left).toBe(true);
  });

  it("both @onRouteEnter and @onRouteLeave forward independently", async () => {
    const tag = nextTag();
    const lifecycle: string[] = [];

    class RealPage extends LoomElement {
      onEnter(params: Record<string, string>) { lifecycle.push(`enter:${params.slug}`); }
      onLeave() { lifecycle.push("leave"); }
    }
    ROUTE_ENTER.set(RealPage.prototype, ["onEnter"]);
    ROUTE_LEAVE.set(RealPage.prototype, ["onLeave"]);

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    // Simulate enter → leave → enter (re-navigation sequence)
    el.onEnter({ slug: "post-a" });
    el.onLeave();
    el.onEnter({ slug: "post-b" });

    expect(lifecycle).toEqual(["enter:post-a", "leave", "enter:post-b"]);
  });

  it("no ROUTE_ENTER/LEAVE on real class — shell has no handlers (no error)", async () => {
    const tag = nextTag();

    class RealPage extends LoomElement {}

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    const handlers = ROUTE_ENTER.from(el) as string[] | undefined;
    expect(handlers ?? []).toHaveLength(0);

    // Non-existent handler should not throw
    expect(() => el.onEnter?.()).not.toThrow();
  });

  it("ROUTE_ENTER with multiple handlers — all forwarded", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;
    const calls: string[] = [];

    class RealPage extends LoomElement {
      onEnter() { calls.push("enter"); }
      fetchData() { calls.push("fetch"); }
    }
    ROUTE_ENTER.set(RealPage.prototype, ["onEnter", "fetchData"]);

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    el.onEnter();
    el.fetchData();

    expect(calls).toEqual(["enter", "fetch"]);
  });
});

// ── @context ──

describe("@lazy + @context", () => {

  it("ContextRequestEvent has composed:true (crosses shadow boundary by spec)", () => {
    const evt = new ContextRequestEvent("test-key", () => {}, true);
    expect(evt.composed).toBe(true);
    expect(evt.bubbles).toBe(true);
  });
});

// ── @on(BusEvent) ──

describe("@lazy + @on(BusEvent)", () => {

  it("bus event handler on impl fires independently of shell", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class TestEvent extends LoomEvent {
      constructor(public readonly value: string) { super(); }
    }

    class RealPage extends LoomElement {
      received = "";

      @on(TestEvent)
      handleTest(e: TestEvent) {
        this.received = e.value;
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    bus.emit(new TestEvent("hello-from-bus"));
    expect(impl.received).toBe("hello-from-bus");

    el.remove();
  });
});
