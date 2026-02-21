/**
 * LoomAnalytics — Tests
 *
 * Tests for @track decorator, AnalyticsTransport, and MockAnalytics.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "@toyz/loom";
import { LoomElement } from "@toyz/loom";
import { AnalyticsTransport, track } from "@toyz/loom-analytics";
import { MockAnalytics } from "@toyz/loom-analytics/testing";

let tagCounter = 0;
function nextTag() { return `test-analytics-${++tagCounter}`; }

let analytics: MockAnalytics;

beforeEach(() => {
  analytics = new MockAnalytics();
  app.use(AnalyticsTransport, analytics);
  document.body.innerHTML = "";
});

// ── Transport Tests ──

describe("AnalyticsTransport", () => {
  it("MockAnalytics extends AnalyticsTransport", () => {
    expect(analytics).toBeInstanceOf(AnalyticsTransport);
  });

  it("records tracked events", () => {
    analytics.track("test.event", { key: "value" });
    expect(analytics.events).toHaveLength(1);
    expect(analytics.events[0].event).toBe("test.event");
    expect(analytics.events[0].meta).toEqual({ key: "value" });
  });

  it("assertTracked passes for tracked events", () => {
    analytics.track("page.view");
    expect(() => analytics.assertTracked("page.view")).not.toThrow();
  });

  it("assertTracked throws for untracked events", () => {
    expect(() => analytics.assertTracked("missing")).toThrow("[MockAnalytics]");
  });

  it("assertTracked matches metadata", () => {
    analytics.track("click", { button: "save" });
    expect(() => analytics.assertTracked("click", { button: "save" })).not.toThrow();
    expect(() => analytics.assertTracked("click", { button: "cancel" })).toThrow();
  });

  it("assertNotTracked passes for untracked events", () => {
    expect(() => analytics.assertNotTracked("missing")).not.toThrow();
  });

  it("assertNotTracked throws for tracked events", () => {
    analytics.track("page.view");
    expect(() => analytics.assertNotTracked("page.view")).toThrow("[MockAnalytics]");
  });

  it("reset clears events", () => {
    analytics.track("a");
    analytics.track("b");
    expect(analytics.events).toHaveLength(2);
    analytics.reset();
    expect(analytics.events).toHaveLength(0);
  });
});

// ── @track on class ──

describe("@track on class", () => {
  it("fires on connectedCallback", () => {
    const tag = nextTag();

    @track("page.dashboard")
    class El extends LoomElement {}
    customElements.define(tag, El);

    expect(analytics.events).toHaveLength(0);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    analytics.assertTracked("page.dashboard");
    expect(analytics.events[0].meta?.element).toBe(tag);
  });

  it("includes custom metadata", () => {
    const tag = nextTag();

    @track("page.settings", { section: "account" })
    class El extends LoomElement {}
    customElements.define(tag, El);

    document.body.appendChild(document.createElement(tag));

    analytics.assertTracked("page.settings", { section: "account" });
  });
});

// ── @track on method ──

describe("@track on method", () => {
  it("fires after method invocation", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @track("button.save")
      handleSave() { return "saved"; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(analytics.events).toHaveLength(0);

    el.handleSave();
    analytics.assertTracked("button.save");
    expect(analytics.events[0].meta?.method).toBe("handleSave");
  });
});

// ── @track on accessor ──

describe("@track on accessor", () => {
  it("fires on set", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @track("theme.change")
      accessor theme = "dark";
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    analytics.reset(); // clear any init events

    el.theme = "light";
    analytics.assertTracked("theme.change", { property: "theme", value: "light" });
  });

  it("preserves get/set behavior", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @track("count.change")
      accessor count = 0;
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    el.count = 42;
    expect(el.count).toBe(42);
  });
});

// ── DI Integration ──

describe("DI integration", () => {
  it("MockAnalytics can be provided via app.use", () => {
    const transport = new MockAnalytics();
    app.use(AnalyticsTransport, transport);
    const resolved = app.get(AnalyticsTransport);
    expect(resolved).toBe(transport);
    expect(resolved).toBeInstanceOf(MockAnalytics);
  });
});

// ── Dynamic Metadata ──

describe("dynamic metadata (fn)", () => {
  it("method: receives element instance", () => {
    const tag = nextTag();

    class El extends LoomElement {
      accessor userId = "u42";

      @track("action", (el: any) => ({ uid: el.userId }))
      doAction() {}
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.doAction();

    analytics.assertTracked("action", { uid: "u42", method: "doAction" });
  });

  it("accessor: receives element instance", () => {
    const tag = nextTag();

    class El extends LoomElement {
      accessor page = "home";

      @track("theme.set", (el: any) => ({ page: el.page }))
      accessor theme = "dark";
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    analytics.reset();

    el.theme = "light";
    analytics.assertTracked("theme.set", { page: "home", property: "theme", value: "light" });
  });

  it("class: receives element instance at connect time", () => {
    const tag = nextTag();

    @track("page.mount", (el: any) => ({ tag: el.tagName.toLowerCase() }))
    class El extends LoomElement {}
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    analytics.assertTracked("page.mount", { tag, element: tag });
  });
});
