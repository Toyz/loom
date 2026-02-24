/**
 * Tests: Route meta injection via @prop({ meta })
 *
 * Covers:
 *   - @prop({ meta: routeMeta }) — full meta decompose
 *   - @prop({ meta: "key" }) — single meta value pick
 *   - Group meta inheritance (group → route merge)
 *   - Route-level meta overrides group-level meta
 *   - Meta combined with params and query bindings
 *   - @transform applied to meta values
 *   - RouteChanged event carries meta
 *   - RouteEntry.meta populated correctly
 *   - Empty meta defaults
 *
 * Strategy: We test metadata registration on constructors,
 * simulate _injectRouteData logic, and verify the full
 * decorator pipeline.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { prop, routeMeta, params } from "../src/store/decorators";
import { transform } from "../src/transform/transform";
import { ROUTE_PROPS, TRANSFORMS } from "../src/decorators/symbols";
import { routes, matchRoute, GROUP_META } from "../src/router/route";
import { route, group } from "../src/router/decorators";
import { RouteChanged } from "../src/router/events";

// ── Helpers ──

/** Tiny replica of outlet._injectRouteData with meta support */
function injectRouteData(
  el: any,
  routeParams: Record<string, string>,
  meta: Record<string, unknown> = {},
) {
  const ctor = el.constructor;
  const routeBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
  const transforms = ctor[TRANSFORMS.key] as Map<string, Function> | undefined;

  for (const binding of routeBindings) {
    let value: any;

    if (binding.params === params) {
      value = { ...routeParams };
    } else if (typeof binding.param === "string") {
      value = routeParams[binding.param] ?? "";
    } else if (binding.meta === routeMeta) {
      value = { ...meta };
    } else if (typeof binding.meta === "string") {
      value = meta[binding.meta];
    }

    if (transforms?.has(binding.propKey) && value !== undefined) {
      value = transforms.get(binding.propKey)!(value);
    }

    if (value !== undefined) {
      el[binding.propKey] = value;
    }
  }
}

// Clear route table between tests
beforeEach(() => {
  routes.length = 0;
});

// ── Metadata registration ──

describe("@prop({ meta }) — metadata registration", () => {
  it("registers a full meta binding with routeMeta sentinel", () => {
    class MyEl {
      @prop({ meta: routeMeta }) accessor allMeta: any;
    }

    // Force initializer to run
    const instance = new MyEl();
    const bindings = (MyEl as any)[ROUTE_PROPS.key];

    expect(bindings).toBeDefined();
    expect(bindings).toHaveLength(1);
    expect(bindings[0].propKey).toBe("allMeta");
    expect(bindings[0].meta).toBe(routeMeta);
  });

  it("registers a single meta key binding", () => {
    class MyEl {
      @prop({ meta: "layout" }) accessor layout: any;
    }

    const instance = new MyEl();
    const bindings = (MyEl as any)[ROUTE_PROPS.key];

    expect(bindings).toBeDefined();
    expect(bindings).toHaveLength(1);
    expect(bindings[0].propKey).toBe("layout");
    expect(bindings[0].meta).toBe("layout");
  });

  it("registers multiple meta bindings on the same class", () => {
    class MyEl {
      @prop({ meta: "layout" }) accessor layout: any;
      @prop({ meta: "role" }) accessor role: any;
      @prop({ meta: routeMeta }) accessor allMeta: any;
    }

    const instance = new MyEl();
    const bindings = (MyEl as any)[ROUTE_PROPS.key];

    expect(bindings).toHaveLength(3);
    expect(bindings.map((b: any) => b.propKey)).toEqual(["layout", "role", "allMeta"]);
  });
});

// ── Injection behavior ──

describe("@prop({ meta }) — injection", () => {
  it("injects full meta object with routeMeta sentinel", () => {
    class MyEl {
      @prop({ meta: routeMeta }) accessor allMeta: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, { layout: "sidebar", role: "admin" });

    expect(el.allMeta).toEqual({ layout: "sidebar", role: "admin" });
  });

  it("injects a copy of meta (not a reference)", () => {
    class MyEl {
      @prop({ meta: routeMeta }) accessor allMeta: any;
    }

    const meta = { layout: "sidebar" };
    const el = new MyEl();
    injectRouteData(el, {}, meta);

    // Mutating the injected value should not affect the original
    el.allMeta.layout = "full";
    expect(meta.layout).toBe("sidebar");
  });

  it("injects a single meta value by key", () => {
    class MyEl {
      @prop({ meta: "layout" }) accessor layout: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, { layout: "dashboard", theme: "dark" });

    expect(el.layout).toBe("dashboard");
  });

  it("returns undefined for missing meta key", () => {
    class MyEl {
      @prop({ meta: "missing" }) accessor missing: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, { layout: "sidebar" });

    // Missing keys are undefined — not injected
    expect(el.missing).toBeUndefined();
  });

  it("injects empty object when no meta provided (routeMeta)", () => {
    class MyEl {
      @prop({ meta: routeMeta }) accessor allMeta: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, {});

    expect(el.allMeta).toEqual({});
  });

  it("handles multiple meta keys simultaneously", () => {
    class MyEl {
      @prop({ meta: "layout" }) accessor layout: any;
      @prop({ meta: "role" }) accessor role: any;
      @prop({ meta: "theme" }) accessor theme: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, { layout: "sidebar", role: "editor", theme: "dark" });

    expect(el.layout).toBe("sidebar");
    expect(el.role).toBe("editor");
    expect(el.theme).toBe("dark");
  });

  it("combines meta with params bindings", () => {
    class MyEl {
      @prop({ param: "id" }) accessor userId: any;
      @prop({ meta: "layout" }) accessor layout: any;
    }

    const el = new MyEl();
    injectRouteData(el, { id: "42" }, { layout: "full" });

    expect(el.userId).toBe("42");
    expect(el.layout).toBe("full");
  });

  it("combines full meta with full params", () => {
    class MyEl {
      @prop({ params }) accessor routeParams: any;
      @prop({ meta: routeMeta }) accessor routeMetaData: any;
    }

    const el = new MyEl();
    injectRouteData(el, { id: "42", slug: "hello" }, { role: "admin" });

    expect(el.routeParams).toEqual({ id: "42", slug: "hello" });
    expect(el.routeMetaData).toEqual({ role: "admin" });
  });
});

// ── @transform with meta ──

describe("@prop({ meta }) — with @transform", () => {
  it("applies @transform to a single meta value", () => {
    class MyEl {
      @prop({ meta: "count" })
      @transform(Number)
      accessor count: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, { count: "42" });

    expect(el.count).toBe(42);
  });

  it("applies @transform to full meta object", () => {
    class MyEl {
      @prop({ meta: routeMeta })
      @transform((m: any) => ({ ...m, processed: true }))
      accessor allMeta: any;
    }

    const el = new MyEl();
    injectRouteData(el, {}, { layout: "sidebar" });

    expect(el.allMeta).toEqual({ layout: "sidebar", processed: true });
  });
});

// ── Route + Group integration ──

describe("@route meta — RouteEntry population", () => {
  it("stores meta on RouteEntry", () => {
    @route("/admin", { meta: { role: "admin", layout: "sidebar" } })
    class AdminPage {}

    const match = matchRoute("/admin");
    expect(match).not.toBeNull();
    expect(match!.entry.meta).toEqual({ role: "admin", layout: "sidebar" });
  });

  it("defaults meta to empty object when not specified", () => {
    @route("/basic")
    class BasicPage {}

    const match = matchRoute("/basic");
    expect(match).not.toBeNull();
    expect(match!.entry.meta).toEqual({});
  });
});

describe("@group meta — inheritance", () => {
  it("inherits group meta on child routes", () => {
    @group("/admin", { meta: { requiresAuth: true, layout: "sidebar" } })
    class AdminGroup {}

    @route("/users", { group: AdminGroup })
    class AdminUsers {}

    const match = matchRoute("/admin/users");
    expect(match).not.toBeNull();
    expect(match!.entry.meta).toEqual({ requiresAuth: true, layout: "sidebar" });
  });

  it("route-level meta overrides group-level meta", () => {
    @group("/admin", { meta: { layout: "sidebar", requiresAuth: true } })
    class AdminGroup {}

    @route("/public", { group: AdminGroup, meta: { requiresAuth: false } })
    class AdminPublic {}

    const match = matchRoute("/admin/public");
    expect(match).not.toBeNull();
    // route-level requiresAuth: false overrides group-level requiresAuth: true
    expect(match!.entry.meta).toEqual({ layout: "sidebar", requiresAuth: false });
  });

  it("route-level meta adds new keys to group meta", () => {
    @group("/dashboard", { meta: { layout: "sidebar" } })
    class DashGroup {}

    @route("/stats", { group: DashGroup, meta: { role: "analyst" } })
    class DashStats {}

    const match = matchRoute("/dashboard/stats");
    expect(match).not.toBeNull();
    expect(match!.entry.meta).toEqual({ layout: "sidebar", role: "analyst" });
  });

  it("chains meta through nested groups", () => {
    @group("/app", { meta: { theme: "dark" } })
    class AppGroup {}

    @group("/admin", { meta: { requiresAuth: true } })
    @route("/", { group: AppGroup })
    class AdminGroup {}

    @route("/logs", { group: AdminGroup, meta: { audit: true } })
    class AdminLogs {}

    const match = matchRoute("/app/admin/logs");
    expect(match).not.toBeNull();
    // theme (from AppGroup) + requiresAuth (from AdminGroup) + audit (from route)
    expect(match!.entry.meta).toEqual({
      theme: "dark",
      requiresAuth: true,
      audit: true,
    });
  });

  it("inner group meta overrides outer group meta", () => {
    @group("/app", { meta: { layout: "full", theme: "light" } })
    class AppGroup {}

    @group("/admin", { meta: { layout: "sidebar" } })
    @route("/", { group: AppGroup })
    class AdminGroup {}

    @route("/dashboard", { group: AdminGroup })
    class AdminDash {}

    const match = matchRoute("/app/admin/dashboard");
    expect(match).not.toBeNull();
    // inner group "sidebar" overrides outer group "full"
    expect(match!.entry.meta).toEqual({ layout: "sidebar", theme: "light" });
  });

  it("stores meta in GROUP_META", () => {
    @group("/api", { meta: { version: "v2", internal: true } })
    class ApiGroup {}

    const groupMeta = (ApiGroup as any)[GROUP_META];
    expect(groupMeta.meta).toEqual({ version: "v2", internal: true });
  });
});

// ── RouteChanged event ──

describe("RouteChanged — meta on event", () => {
  it("carries meta in the event", () => {
    const event = new RouteChanged("/admin", { id: "1" }, "/", { layout: "sidebar" });
    expect(event.meta).toEqual({ layout: "sidebar" });
  });

  it("defaults meta to empty object", () => {
    const event = new RouteChanged("/home", {}, "/");
    expect(event.meta).toEqual({});
  });
});

// ── Meta value types ──

describe("@prop({ meta }) — value types", () => {
  it("handles string meta values", () => {
    class MyEl {
      @prop({ meta: "name" }) accessor name: any;
    }
    const el = new MyEl();
    injectRouteData(el, {}, { name: "test" });
    expect(el.name).toBe("test");
  });

  it("handles number meta values", () => {
    class MyEl {
      @prop({ meta: "priority" }) accessor priority: any;
    }
    const el = new MyEl();
    injectRouteData(el, {}, { priority: 42 });
    expect(el.priority).toBe(42);
  });

  it("handles boolean meta values", () => {
    class MyEl {
      @prop({ meta: "hidden" }) accessor hidden: any;
    }
    const el = new MyEl();
    injectRouteData(el, {}, { hidden: false });
    expect(el.hidden).toBe(false);
  });

  it("handles object meta values", () => {
    class MyEl {
      @prop({ meta: "config" }) accessor config: any;
    }
    const el = new MyEl();
    injectRouteData(el, {}, { config: { a: 1, b: "two" } });
    expect(el.config).toEqual({ a: 1, b: "two" });
  });

  it("handles array meta values", () => {
    class MyEl {
      @prop({ meta: "tags" }) accessor tags: any;
    }
    const el = new MyEl();
    injectRouteData(el, {}, { tags: ["a", "b", "c"] });
    expect(el.tags).toEqual(["a", "b", "c"]);
  });

  it("handles null meta values", () => {
    class MyEl {
      @prop({ meta: "empty" }) accessor empty: any;
    }
    const el = new MyEl();
    injectRouteData(el, {}, { empty: null });
    // null is a valid value — should be injected
    expect(el.empty).toBeNull();
  });
});
