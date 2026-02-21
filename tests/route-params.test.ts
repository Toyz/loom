/**
 * Tests: Route param & query injection via @prop
 *
 * Covers:
 *   - @prop({ param: "id" }) — single param pick
 *   - @prop({ params }) — full param decompose
 *   - @prop({ query: "tab" }) — single query pick
 *   - @prop({ query: routeQuery }) — full query decompose
 *   - @transform with route params
 *   - Backward compat: unbound params → setAttribute
 *
 * Strategy: We test metadata registration and then simulate
 * the _injectRouteData logic, since it's a private method on LoomOutlet.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prop, params, routeQuery, reactive } from "../src/store/decorators";
import { transform } from "../src/transform/transform";
import { ROUTE_PROPS, TRANSFORMS } from "../src/decorators/symbols";

// ── Helpers ──

/** Tiny replica of outlet._injectRouteData — same logic, testable. */
function injectRouteData(
  el: any,
  routeParams: Record<string, string>,
  queryString = "",
) {
  const ctor = el.constructor;
  const routeBindings: any[] = ctor[ROUTE_PROPS] ?? [];
  const transforms = ctor[TRANSFORMS] as Map<string, Function> | undefined;
  const queryMap = new URLSearchParams(queryString);
  const boundParamKeys = new Set<string>();

  for (const binding of routeBindings) {
    let value: any;

    if (binding.params === params) {
      value = { ...routeParams };
    } else if (typeof binding.param === "string") {
      value = routeParams[binding.param] ?? "";
      boundParamKeys.add(binding.param);
    } else if (binding.query === routeQuery) {
      value = Object.fromEntries(queryMap);
    } else if (typeof binding.query === "string") {
      value = queryMap.get(binding.query) ?? "";
    }

    if (transforms?.has(binding.propKey) && value !== undefined) {
      value = transforms.get(binding.propKey)!(value);
    }

    if (value !== undefined) {
      el[binding.propKey] = value;
    }
  }

  // Backward compat: unbound params set as attributes
  const unboundParams: Record<string, string> = {};
  for (const [key, val] of Object.entries(routeParams)) {
    if (!boundParamKeys.has(key)) {
      unboundParams[key] = val;
    }
  }
  return { boundParamKeys, unboundParams };
}

// ── Metadata registration ──

describe("@prop route metadata registration", () => {
  it("@prop({ param }) registers single param binding", () => {
    class Page {
      @prop({ param: "id" }) accessor userId = "";
    }
    new Page(); // trigger addInitializer

    const bindings = (Page as any)[ROUTE_PROPS] as any[];
    expect(bindings).toBeDefined();
    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toEqual({ propKey: "userId", param: "id" });
  });

  it("@prop({ params }) registers full decompose binding", () => {
    class Page {
      @prop({ params }) accessor allParams: Record<string, string> = {};
    }
    new Page();

    const bindings = (Page as any)[ROUTE_PROPS] as any[];
    expect(bindings).toBeDefined();
    expect(bindings).toHaveLength(1);
    expect(bindings[0].propKey).toBe("allParams");
    expect(bindings[0].params).toBe(params);
  });

  it("@prop({ query }) registers single query binding", () => {
    class Page {
      @prop({ query: "tab" }) accessor tab = "";
    }
    new Page();

    const bindings = (Page as any)[ROUTE_PROPS] as any[];
    expect(bindings).toBeDefined();
    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toEqual({ propKey: "tab", query: "tab" });
  });

  it("@prop({ query: routeQuery }) registers full query decompose", () => {
    class Page {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }
    new Page();

    const bindings = (Page as any)[ROUTE_PROPS] as any[];
    expect(bindings).toBeDefined();
    expect(bindings).toHaveLength(1);
    expect(bindings[0].propKey).toBe("queryParams");
    expect(bindings[0].query).toBe(routeQuery);
  });

  it("multiple bindings coexist on same class", () => {
    class Page {
      @prop({ param: "id" }) accessor userId = "";
      @prop({ query: "tab" }) accessor tab = "";
      @prop({ params }) accessor all: Record<string, string> = {};
    }
    new Page();

    const bindings = (Page as any)[ROUTE_PROPS] as any[];
    expect(bindings).toHaveLength(3);

    const propKeys = bindings.map((b: any) => b.propKey);
    expect(propKeys).toContain("userId");
    expect(propKeys).toContain("tab");
    expect(propKeys).toContain("all");
  });
});

// ── Injection behavior ──

describe("route param injection", () => {
  it("single param pick sets property value", () => {
    class Page {
      @prop({ param: "id" }) accessor userId = "";
    }
    const page = new Page();

    injectRouteData(page, { id: "42" });
    expect(page.userId).toBe("42");
  });

  it("single param pick defaults to empty string for missing param", () => {
    class Page {
      @prop({ param: "slug" }) accessor slug = "";
    }
    const page = new Page();

    injectRouteData(page, { id: "42" }); // "slug" is not in params
    expect(page.slug).toBe("");
  });

  it("full param decompose sets all params as object", () => {
    class Page {
      @prop({ params }) accessor allParams: Record<string, string> = {};
    }
    const page = new Page();

    injectRouteData(page, { id: "42", name: "alice" });
    expect(page.allParams).toEqual({ id: "42", name: "alice" });
  });

  it("full param decompose creates a copy (not a reference)", () => {
    class Page {
      @prop({ params }) accessor allParams: Record<string, string> = {};
    }
    const page = new Page();
    const original = { id: "42" };

    injectRouteData(page, original);
    expect(page.allParams).toEqual({ id: "42" });
    expect(page.allParams).not.toBe(original); // different object
  });
});

describe("route query injection", () => {
  it("single query pick extracts one query param", () => {
    class Page {
      @prop({ query: "tab" }) accessor tab = "";
    }
    const page = new Page();

    injectRouteData(page, {}, "tab=settings&sort=asc");
    expect(page.tab).toBe("settings");
  });

  it("single query pick defaults to empty string for missing query", () => {
    class Page {
      @prop({ query: "tab" }) accessor tab = "";
    }
    const page = new Page();

    injectRouteData(page, {}, "sort=asc");
    expect(page.tab).toBe("");
  });

  it("full query decompose sets all query params as object", () => {
    class Page {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }
    const page = new Page();

    injectRouteData(page, {}, "tab=settings&sort=asc&page=2");
    expect(page.queryParams).toEqual({
      tab: "settings",
      sort: "asc",
      page: "2",
    });
  });

  it("full query decompose returns empty object for no query params", () => {
    class Page {
      @prop({ query: routeQuery }) accessor queryParams: Record<string, string> = {};
    }
    const page = new Page();

    injectRouteData(page, {}, "");
    expect(page.queryParams).toEqual({});
  });
});

describe("combined param + query injection", () => {
  it("param and query bindings both work on the same component", () => {
    class Page {
      @prop({ param: "id" }) accessor userId = "";
      @prop({ query: "tab" }) accessor tab = "";
    }
    const page = new Page();

    injectRouteData(page, { id: "42" }, "tab=settings");
    expect(page.userId).toBe("42");
    expect(page.tab).toBe("settings");
  });

  it("full decompose for both params and query", () => {
    class Page {
      @prop({ params }) accessor allParams: Record<string, string> = {};
      @prop({ query: routeQuery }) accessor allQuery: Record<string, string> = {};
    }
    const page = new Page();

    injectRouteData(page, { id: "42", slug: "hello" }, "tab=settings&sort=asc");
    expect(page.allParams).toEqual({ id: "42", slug: "hello" });
    expect(page.allQuery).toEqual({ tab: "settings", sort: "asc" });
  });

  it("single + full decompose on the same class", () => {
    class Page {
      @prop({ param: "id" }) accessor userId = "";
      @prop({ params }) accessor allParams: Record<string, string> = {};
      @prop({ query: "tab" }) accessor tab = "";
    }
    const page = new Page();

    injectRouteData(page, { id: "42", name: "alice" }, "tab=settings");
    expect(page.userId).toBe("42");
    expect(page.allParams).toEqual({ id: "42", name: "alice" });
    expect(page.tab).toBe("settings");
  });
});

describe("@transform with route params", () => {
  it("transforms a single param value", () => {
    class Page {
      @prop({ param: "id" })
      @transform((v: unknown) => Number(v))
      accessor userId = 0;
    }
    const page = new Page();

    injectRouteData(page, { id: "42" });
    expect(page.userId).toBe(42);
    expect(typeof page.userId).toBe("number");
  });

  it("transforms a query param value", () => {
    class Page {
      @prop({ query: "page" })
      @transform((v: unknown) => Number(v))
      accessor pageNum = 1;
    }
    const page = new Page();

    injectRouteData(page, {}, "page=5");
    expect(page.pageNum).toBe(5);
  });

  it("transforms full param decompose value", () => {
    class Page {
      @prop({ params })
      @transform((v: unknown): Record<string, any> => {
        const raw = v as Record<string, string>;
        return { ...raw, id: Number(raw.id) };
      })
      accessor allParams: Record<string, any> = {};
    }
    const page = new Page();

    injectRouteData(page, { id: "42", name: "alice" });
    expect(page.allParams).toEqual({ id: 42, name: "alice" });
  });

  it("transforms full query decompose value", () => {
    class Page {
      @prop({ query: routeQuery })
      @transform((v: unknown): Record<string, any> => {
        const raw = v as Record<string, string>;
        // Convert "page" to number
        return { ...raw, page: raw.page ? Number(raw.page) : 1 };
      })
      accessor queryParams: Record<string, any> = {};
    }
    const page = new Page();

    injectRouteData(page, {}, "tab=settings&page=3");
    expect(page.queryParams).toEqual({ tab: "settings", page: 3 });
  });
});

describe("backward compat: unbound params as attributes", () => {
  it("returns unbound params for setAttribute fallback", () => {
    class Page {
      @prop({ param: "id" }) accessor userId = "";
    }
    const page = new Page();

    const result = injectRouteData(page, { id: "42", slug: "hello", category: "books" });

    // "id" is bound, so it should NOT be in unbound
    expect(result.boundParamKeys.has("id")).toBe(true);

    // "slug" and "category" are unbound
    expect(result.unboundParams).toEqual({ slug: "hello", category: "books" });
  });

  it("all params are unbound when no @prop route bindings exist", () => {
    class Page {
      @reactive accessor count = 0; // regular reactive, not route-bound
    }
    const page = new Page();

    const result = injectRouteData(page, { id: "42", name: "alice" });
    expect(result.unboundParams).toEqual({ id: "42", name: "alice" });
  });

  it("full param decompose does NOT add to boundParamKeys", () => {
    // Full decompose uses params sentinel, not individual param strings,
    // so individual param keys should remain unbound for backward compat
    class Page {
      @prop({ params }) accessor allParams: Record<string, string> = {};
    }
    const page = new Page();

    const result = injectRouteData(page, { id: "42", name: "alice" });
    // The property is set correctly
    expect(page.allParams).toEqual({ id: "42", name: "alice" });
    // But individual keys are not "bound" so they'd also be set as attributes
    expect(result.unboundParams).toEqual({ id: "42", name: "alice" });
  });
});
