/**
 * Tests: @prop({ query }) forwarding through the @lazy shell boundary
 *
 * The lazy shell must forward query-bound props from the stub shell → the real
 * impl element, both on initial mount and on same-route re-navigation
 * (scheduleUpdate).  Previously only @prop({ param }) was forwarded; @prop({
 * query }) was silently dropped.
 *
 * Coverage:
 *   Initial mount
 *     - single query pick (@prop({ query: "tab" })) on both stub and impl
 *     - single query pick when stub has NO mirror prop (outlet set it directly)
 *     - full routeQuery decompose forwarded on mount
 *     - mixed param + query on same impl class
 *
 *   Re-navigation (scheduleUpdate)
 *     - single query updated after scheduleUpdate
 *     - full routeQuery object updated after scheduleUpdate
 *     - mixed param + query both update together
 *
 *   Edge cases
 *     - query prop keeps its default when the query key is absent on stub
 *     - routeQuery symbol sentinel identity (b.query === binding.query)
 *     - impl-only query binding (no mirror on stub) falls through gracefully
 *     - two query bindings on the same impl (different keys)
 *     - query prop does NOT clobber an already-correct value on re-nav
 */

import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy, LAZY_IMPL } from "../src/element/lazy";
import { component } from "../src/element/decorators";
import { prop } from "../src/store/decorators";
import { routeQuery } from "../src/store/decorators";
import { ROUTE_PROPS } from "../src/decorators/symbols";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-query-${++tagCounter}`; }

const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));

afterEach(() => cleanup());

// ─────────────────────────────────────────────────────────────────────────────
// Helper: simulate what the outlet does — set the query prop directly on the
// shell element (by propKey), then optionally call scheduleUpdate.
// ─────────────────────────────────────────────────────────────────────────────

function setQueryProp(shell: any, propKey: string, value: unknown) {
  shell[propKey] = value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INITIAL MOUNT
// ═══════════════════════════════════════════════════════════════════════════════

describe("@lazy + @prop({ query }) — initial mount forwarding", () => {

  it("single query prop is forwarded when stub has same mirror prop", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    // Simulate outlet setting query prop on the shell before/during connect
    setQueryProp(el, "tab", "settings");
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();
    expect(impl.tab).toBe("settings");
  });

  it("single query prop is forwarded when stub has NO mirror prop", async () => {
    // The outlet can set the property directly on the shell by propKey
    // even if the stub doesn't declare that prop. The impl-only binding
    // should still be forwarded via the stub-matching fallback.
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }

    // Stub declares NO query binding — outlet writes to shell.tab directly
    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    // Outlet would set binding.propKey on the shell directly
    (el as any).tab = "overview";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();
    // propKey found directly on shell by propKey — forwarded
    expect(impl.tab).toBe("overview");
  });

  it("full routeQuery decompose is forwarded on mount", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    setQueryProp(el, "queryParams", { tab: "settings", sort: "asc" });
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();
    expect(impl.queryParams).toEqual({ tab: "settings", sort: "asc" });
  });

  it("mixed @prop({ param }) + @prop({ query }) both forwarded on mount", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "username" }) accessor username = "";
      @prop({ query: "tab" }) accessor tab = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "username" }) accessor username = "";
      @prop({ query: "tab" }) accessor tab = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.username = "alice";
    el.tab = "posts";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.username).toBe("alice");
    expect(impl.tab).toBe("posts");
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// RE-NAVIGATION (scheduleUpdate)
// ═══════════════════════════════════════════════════════════════════════════════

describe("@lazy + @prop({ query }) — re-navigation via scheduleUpdate", () => {

  it("single query prop updates on scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.tab = "overview";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.tab).toBe("overview");

    // Simulate outlet re-navigation: update shell prop, then scheduleUpdate
    el.tab = "settings";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.tab).toBe("settings");
  });

  it("full routeQuery decompose updates on scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.queryParams = { tab: "overview" };
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.queryParams).toEqual({ tab: "overview" });

    el.queryParams = { tab: "settings", sort: "desc" };
    el.scheduleUpdate?.();
    await tick();

    expect(impl.queryParams).toEqual({ tab: "settings", sort: "desc" });
  });

  it("param and query both update correctly on same scheduleUpdate", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
      @prop({ query: "tab" }) accessor tab = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
      @prop({ query: "tab" }) accessor tab = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.slug = "post-1";
    el.tab = "overview";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.slug).toBe("post-1");
    expect(impl.tab).toBe("overview");

    // Navigate to same route, different slug + query
    el.slug = "post-2";
    el.tab = "comments";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.slug).toBe("post-2");
    expect(impl.tab).toBe("comments");
  });

  it("multiple scheduleUpdate calls accumulate changes correctly", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "page" }) accessor page = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: "page" }) accessor page = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.page = "1";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.page).toBe("1");

    // Simulate paginating: p1 → p2 → p3
    for (const p of ["2", "3"]) {
      el.page = p;
      el.scheduleUpdate?.();
      await tick();
    }
    expect(impl.page).toBe("3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("@lazy + @prop({ query }) — edge cases", () => {

  it("query prop keeps its default when stub prop was never set", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "default-tab";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "default-tab";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    // Do NOT set tab — outlet found no query param
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    // Should keep the default, not become undefined
    expect(impl.tab).toBe("default-tab");
  });

  it("routeQuery sentinel identity matches correctly across stub and impl", async () => {
    // Both classes use the same imported routeQuery symbol — the comparison
    // b.query === binding.query must use reference equality (Symbol identity).
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: routeQuery }) accessor q: Record<string, string> = {};
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: routeQuery }) accessor q: Record<string, string> = {};
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.q = { x: "1", y: "2" };
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.q).toEqual({ x: "1", y: "2" });
  });

  it("impl-only query binding (no stub mirror) reads propKey directly from shell", async () => {
    // When the outlet directly sets shell.myProp = value (by propKey), and
    // stub has no ROUTE_PROPS binding for that query, the impl-side loop reads
    // shell[binding.propKey] directly (val = (this as any)[binding.propKey])
    // in the first read before the fallback — so it still works.
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "filter" }) accessor filter = "";
    }

    // Stub has no @prop binding for "filter" at all
    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    // Outlet writes propKey="filter" directly on the shell
    (el as any).filter = "active";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.filter).toBe("active");
  });

  it("two query bindings with different keys both forwarded independently", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "sort" }) accessor sort = "";
      @prop({ query: "filter" }) accessor filter = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ query: "sort" }) accessor sort = "";
      @prop({ query: "filter" }) accessor filter = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.sort = "desc";
    el.filter = "active";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.sort).toBe("desc");
    expect(impl.filter).toBe("active");

    // Update both on re-navigation
    el.sort = "asc";
    el.filter = "completed";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.sort).toBe("asc");
    expect(impl.filter).toBe("completed");
  });

  it("query prop doesn't overwrite impl when value is undefined (no clobber)", async () => {
    // If no stub binding matches (and shell propKey is undefined), the value
    // stays undefined — and the guard `if (val !== undefined)` should prevent
    // clobbering the impl's current value.
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "initial";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {}  // no mirror prop
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    // Outlet does NOT set .tab (no query param in URL)
    document.body.appendChild(el);
    await tick();

    // impl mounts, tab = "initial" (its default)
    const impl = el.shadowRoot!.querySelector(implTag) as any;
    // Manually set impl's tab to confirm it isn't clobbered
    impl.tab = "user-set";

    el.scheduleUpdate?.();
    await tick();

    // Should NOT have been reset to undefined / default
    expect(impl.tab).toBe("user-set");
  });

  it("query binding coexists with params sentinel — all forwarded", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;
    const { params } = await import("../src/store/decorators");

    class RealPage extends LoomElement {
      @prop({ params }) accessor allParams: Record<string, string> = {};
      @prop({ query: "tab" }) accessor tab = "";
    }

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealPage }))
    class StubPage extends LoomElement {
      @prop({ params }) accessor allParams: Record<string, string> = {};
      @prop({ query: "tab" }) accessor tab = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.allParams = { username: "alice", slug: "hello" };
    el.tab = "about";
    document.body.appendChild(el);
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl.allParams).toEqual({ username: "alice", slug: "hello" });
    expect(impl.tab).toBe("about");

    // Re-navigation
    el.allParams = { username: "bob", slug: "world" };
    el.tab = "posts";
    el.scheduleUpdate?.();
    await tick();

    expect(impl.allParams).toEqual({ username: "bob", slug: "world" });
    expect(impl.tab).toBe("posts");
  });

  it("deferred load (loader resolves after mount): query prop forwarded from attribute-set shell", async () => {
    const tag = nextTag();
    const implTag = `${tag}-impl`;

    class RealPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }

    let resolveLoader!: (v: any) => void;
    const loaderPromise = new Promise(r => { resolveLoader = r; });

    @component(tag)
    @lazy(() => loaderPromise)
    class StubPage extends LoomElement {
      @prop({ query: "tab" }) accessor tab = "";
    }
    customElements.define(tag, StubPage);

    const el = document.createElement(tag) as any;
    el.tab = "deferred";
    document.body.appendChild(el);
    await tick();

    // Impl not loaded yet
    expect(el.shadowRoot!.querySelector(implTag)).toBeNull();

    // Resolve loader — impl mounts and should pick up the pre-set query value
    resolveLoader({ default: RealPage });
    await tick();

    const impl = el.shadowRoot!.querySelector(implTag) as any;
    expect(impl).toBeTruthy();
    expect(impl.tab).toBe("deferred");
  });

});
