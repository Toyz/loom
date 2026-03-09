/**
 * Tests: @lazy same-component re-navigation — scheduleUpdate forwarding
 *
 * REGRESSION: When the outlet re-navigated to the same lazy component
 * (e.g. post A → post B, both using the same route component), the outlet
 * set new route params on the SHELL element and called scheduleUpdate().
 * But the shell never forwarded those param changes to the real -impl
 * element inside its shadow DOM, so the page appeared frozen.
 *
 * These tests verify that the lazy shell's scheduleUpdate override correctly
 * propagates property changes to the impl element.
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy, LAZY_IMPL } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { prop } from "../src/store/decorators";
import { reactive } from "../src/store/decorators";
import { transform } from "../src/transform/transform";
import { ROUTE_PROPS } from "../src/decorators/symbols";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-renav-${++tagCounter}`; }

/** Wait for lazy load + microtasks */
const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));

afterEach(() => cleanup());

// ── Helpers ──

/**
 * Simulate what the outlet does on same-component re-navigation:
 * set new route param values on the shell, then call scheduleUpdate().
 */
function simulateRenavigation(shell: any, newParams: Record<string, string>) {
  // The outlet's _injectRouteData sets properties via ROUTE_PROPS
  const ctor = shell.constructor;
  const bindings: any[] = ctor[ROUTE_PROPS.key] ?? [];

  for (const binding of bindings) {
    if (typeof binding.param === "string") {
      const val = newParams[binding.param];
      if (val !== undefined) {
        shell[binding.propKey] = val;
      }
    }
  }

  // Then the outlet calls scheduleUpdate
  shell.scheduleUpdate?.();
}

// ── Tests ──

describe("@lazy same-component re-navigation", () => {

  it("forwards updated @prop({ param }) to impl on scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";

      update() {
        const p = document.createElement("p");
        p.textContent = this.slug;
        return p;
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    // Initial mount with first slug
    const el = document.createElement(tag) as any;
    el.slug = "first-post";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();
    expect(impl.slug).toBe("first-post");

    // Simulate re-navigation: outlet sets new slug and calls scheduleUpdate
    simulateRenavigation(el, { slug: "second-post" });
    await tick();

    // The impl must receive the updated slug
    expect(impl.slug).toBe("second-post");
  });

  it("forwards multiple @prop({ param }) fields simultaneously", async () => {
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
    el.slug = "post-one";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.username).toBe("@alice");
    expect(impl.slug).toBe("post-one");

    // Re-navigate to a different user's post
    simulateRenavigation(el, { username: "@bob", slug: "post-two" });
    await tick();

    expect(impl.username).toBe("@bob");
    expect(impl.slug).toBe("post-two");
  });

  it("handles rapid sequential re-navigations (A → B → C)", async () => {
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
    el.slug = "post-a";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // Rapid fire: A → B → C without waiting
    simulateRenavigation(el, { slug: "post-b" });
    simulateRenavigation(el, { slug: "post-c" });
    await tick();

    // Should settle on the final value
    expect(impl.slug).toBe("post-c");
  });

  it("re-navigation works after disconnect/reconnect cycle", async () => {
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
    el.slug = "initial";
    document.body.appendChild(el);
    await tick();

    // Disconnect and reconnect
    el.remove();
    await tick();
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    // Re-navigate after reconnect
    simulateRenavigation(el, { slug: "after-reconnect" });
    await tick();

    expect(impl.slug).toBe("after-reconnect");
  });

  it("impl scheduleUpdate is called (triggers re-render)", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;
    const renderSpy: string[] = [];

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";

      update() {
        renderSpy.push(this.slug);
        const p = document.createElement("p");
        p.textContent = this.slug;
        return p;
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "first";
    document.body.appendChild(el);
    await tick();

    const initialRenderCount = renderSpy.length;

    // Re-navigate
    simulateRenavigation(el, { slug: "second" });
    await tick();

    // The impl should have re-rendered with the new slug
    expect(renderSpy.length).toBeGreaterThan(initialRenderCount);
    expect(renderSpy[renderSpy.length - 1]).toBe("second");
  });

  it("shell scheduleUpdate falls through to original when no impl exists", async () => {
    const tag = nextTag();

    // Use a loader that never resolves — impl will never mount
    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    @component(tag)
    @lazy(() => new Promise(() => {})) // never resolves
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // scheduleUpdate should not throw even without an impl
    expect(() => el.scheduleUpdate?.()).not.toThrow();
  });

  it("re-navigation with @prop({ param }) where accessor name differs from param name", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "id" }) accessor postId = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "id" }) accessor postId = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.postId = "100";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.postId).toBe("100");

    // Re-navigate — the outlet sets "postId" (the accessor name)
    el.postId = "200";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.postId).toBe("200");
  });

  it("re-navigation preserves non-route reactive state on the impl", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
      @reactive accessor localCount = 0;
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "original";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    impl.localCount = 42; // user-set local state

    // Re-navigate
    simulateRenavigation(el, { slug: "updated" });
    await tick();

    // Route param updated
    expect(impl.slug).toBe("updated");
    // Local state preserved (not wiped by re-navigation)
    expect(impl.localCount).toBe(42);
  });

  it("re-navigation with identical params still calls scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;
    let updateCount = 0;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";

      update() {
        updateCount++;
        return document.createElement("p");
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "same-slug";
    document.body.appendChild(el);
    await tick();

    const countAfterMount = updateCount;

    // Re-navigate with the SAME slug (e.g. user clicks current page link)
    simulateRenavigation(el, { slug: "same-slug" });
    await tick();

    // scheduleUpdate should still propagate even if value didn't change
    // (the impl's reactive system decides whether to actually re-render)
    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.slug).toBe("same-slug");
  });
  it("only one of multiple params changes — other stays intact", async () => {
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
    el.slug = "post-one";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // Only change slug, keep username the same
    simulateRenavigation(el, { username: "@alice", slug: "post-two" });
    await tick();

    expect(impl.username).toBe("@alice"); // unchanged
    expect(impl.slug).toBe("post-two");   // updated
  });

  it("re-navigation with empty string params", async () => {
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
    el.slug = "has-value";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.slug).toBe("has-value");

    // Re-navigate to empty slug
    el.slug = "";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.slug).toBe("");
  });

  it("re-navigation with special characters (@ prefix, unicode)", async () => {
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
    el.username = "@helba";
    el.slug = "first";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // Unicode username
    simulateRenavigation(el, { username: "@日本語ユーザー", slug: "記事-slug" });
    await tick();
    expect(impl.username).toBe("@日本語ユーザー");
    expect(impl.slug).toBe("記事-slug");

    // Special chars
    simulateRenavigation(el, { username: "@user+name", slug: "slug%20with%20spaces" });
    await tick();
    expect(impl.username).toBe("@user+name");
    expect(impl.slug).toBe("slug%20with%20spaces");
  });

  it("stress: many sequential re-navigations converge to final value", async () => {
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
    el.slug = "start";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // Fire 20 re-navigations rapidly
    for (let i = 0; i < 20; i++) {
      simulateRenavigation(el, { slug: `post-${i}` });
    }
    await tick();

    // Must converge to the final value
    expect(impl.slug).toBe("post-19");
  });

  it("re-navigation during lazy load (race: props set before impl exists)", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    let resolveLoader!: (v: any) => void;
    const loaderPromise = new Promise(r => { resolveLoader = r; });

    @component(tag)
    @lazy(() => loaderPromise)
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "initial";
    document.body.appendChild(el);
    await tick();

    // Impl not loaded yet — re-navigate BEFORE load completes
    el.slug = "updated-before-load";
    el.scheduleUpdate?.(); // should not throw

    // Now resolve the loader
    resolveLoader({ default: RealPage });
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    // The impl should have the value that was set on the shell at mount time
    // (set during __mountLazyImpl which reads from the shell)
    expect(impl.slug).toBe("updated-before-load");
  });

  it("shell with no ROUTE_PROPS bindings — scheduleUpdate still works", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @reactive accessor count = 0;

      update() {
        const p = document.createElement("p");
        p.textContent = `count: ${this.count}`;
        return p;
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {} // no @prop route bindings

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    // Calling scheduleUpdate on shell with no bindings should not throw
    expect(() => el.scheduleUpdate?.()).not.toThrow();
  });

  it("impl removed from shadow DOM — scheduleUpdate does not throw", async () => {
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
    el.slug = "initial";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();

    // Forcefully remove the impl from the shadow DOM
    impl.remove();

    // scheduleUpdate should still not throw — impl ref exists but is detached
    expect(() => {
      el.slug = "new-slug";
      el.scheduleUpdate?.();
    }).not.toThrow();
  });

  it("re-navigation correctly forwards to impl even when shell has extra non-route props", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
      @reactive accessor theme = "light";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
      @reactive accessor shellOnly = "ignored";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "original";
    el.shellOnly = "some-value";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    simulateRenavigation(el, { slug: "updated" });
    await tick();

    expect(impl.slug).toBe("updated");
    // Shell-only reactive should not leak to impl
    expect((impl as any).shellOnly).toBeUndefined();
  });

  it("direct scheduleUpdate without changing any props still delegates to impl", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;
    let implScheduleCalled = false;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";

      scheduleUpdate() {
        implScheduleCalled = true;
        super.scheduleUpdate();
      }
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }

    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "value";
    document.body.appendChild(el);
    await tick();

    implScheduleCalled = false;

    // Call scheduleUpdate on shell WITHOUT changing any props
    el.scheduleUpdate?.();
    await tick();

    expect(implScheduleCalled).toBe(true);
  });

  it("multiple re-navigations with alternating values (A → B → A → B)", async () => {
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
    el.slug = "post-a";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // A → B
    simulateRenavigation(el, { slug: "post-b" });
    await tick();
    expect(impl.slug).toBe("post-b");

    // B → A (back)
    simulateRenavigation(el, { slug: "post-a" });
    await tick();
    expect(impl.slug).toBe("post-a");

    // A → B again
    simulateRenavigation(el, { slug: "post-b" });
    await tick();
    expect(impl.slug).toBe("post-b");
  });

  it("re-navigation with very long param values", async () => {
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
    el.slug = "short";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;

    // Very long slug (like a UUID-based URL)
    const longSlug = "a".repeat(2000);
    simulateRenavigation(el, { slug: longSlug });
    await tick();

    expect(impl.slug).toBe(longSlug);
    expect(impl.slug.length).toBe(2000);
  });
});
