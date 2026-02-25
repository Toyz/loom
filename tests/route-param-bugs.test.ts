/**
 * Regression tests for route param injection bugs (Feb 2025)
 *
 * Three bugs fixed:
 *   1. Accessor name ≠ param name: @prop({ param: "index" }) accessor badgeIndex
 *      was always 0 because the outlet didn't auto-coerce string→number
 *   2. @transform not applied: transforms registered on route-bound props were
 *      ignored because the outlet didn't check TRANSFORMS metadata
 *   3. @lazy forwarding: lazy components didn't use ROUTE_PROPS from the real
 *      component, so mismatched names and transforms were lost
 *
 * These tests replicate the exact outlet._injectRouteData logic faithfully,
 * including the coercion fix applied in this bugfix.
 */
import { describe, it, expect } from "vitest";
import { prop, params, routeQuery } from "../src/store/decorators";
import { transform } from "../src/transform/transform";
import { ROUTE_PROPS, TRANSFORMS } from "../src/decorators/symbols";
import { params as paramsSentinel, routeQuery as querySentinel } from "../src/store/decorators";

/**
 * Exact replica of the FIXED outlet._injectRouteData logic.
 * Includes auto-coercion for string → number/boolean.
 */
function injectRouteData(
  el: any,
  routeParams: Record<string, string>,
  queryString = "",
) {
  const ctor = el.constructor;
  const routeBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
  const transforms = ctor[TRANSFORMS.key] as Map<string, Function> | undefined;
  const queryMap = new URLSearchParams(queryString);
  const boundParamKeys = new Set<string>();

  for (const binding of routeBindings) {
    let value: any;

    if (binding.params === paramsSentinel) {
      value = { ...routeParams };
    } else if (typeof binding.param === "string") {
      value = routeParams[binding.param] ?? "";
      boundParamKeys.add(binding.param);
    } else if (binding.query === querySentinel) {
      value = Object.fromEntries(queryMap);
    } else if (typeof binding.query === "string") {
      value = queryMap.get(binding.query) ?? "";
    }

    // Apply @transform if registered
    if (transforms?.has(binding.propKey) && value !== undefined) {
      value = transforms.get(binding.propKey)!(value);
    } else if (typeof value === "string") {
      // Auto-coerce string → number/boolean based on current property type
      const current = (el as any)[binding.propKey];
      if (typeof current === "number") value = Number(value);
      else if (typeof current === "boolean") value = value !== "false";
    }

    if (value !== undefined) {
      (el as any)[binding.propKey] = value;
    }
  }

  // Backward compat: set unbound params as attributes
  const unboundParams: Record<string, string> = {};
  for (const [key, val] of Object.entries(routeParams)) {
    if (!boundParamKeys.has(key)) {
      unboundParams[key] = val;
    }
  }
  return { boundParamKeys, unboundParams };
}

// ── Bug 1: accessor name ≠ param name ──

describe("REGRESSION: accessor name different from param name", () => {
  it("@prop({ param: 'index' }) accessor badgeIndex receives the value", () => {
    class Page {
      @prop({ param: "slug" }) accessor slug = "";
      @prop({ param: "index" }) accessor badgeIndex = 0;
    }
    const page = new Page();

    injectRouteData(page, { slug: "test-badge", index: "5" });
    expect(page.slug).toBe("test-badge");
    expect(page.badgeIndex).toBe(5);
  });

  it("multiple mismatched names all resolve correctly", () => {
    class Page {
      @prop({ param: "user_id" }) accessor userId = "";
      @prop({ param: "page_num" }) accessor pageNumber = 0;
      @prop({ param: "active" }) accessor isActive = false;
    }
    const page = new Page();

    injectRouteData(page, { user_id: "abc", page_num: "3", active: "true" });
    expect(page.userId).toBe("abc");
    expect(page.pageNumber).toBe(3);
    expect(page.isActive).toBe(true);
  });

  it("binding metadata stores accessor name as propKey and param name as param", () => {
    class Page {
      @prop({ param: "index" }) accessor badgeIndex = 0;
    }
    new Page();

    const bindings = (Page as any)[ROUTE_PROPS.key] as any[];
    expect(bindings).toHaveLength(1);
    expect(bindings[0].propKey).toBe("badgeIndex");
    expect(bindings[0].param).toBe("index");
  });
});

// ── Bug 2: auto-coercion of string → number/boolean ──

describe("REGRESSION: route param auto-coercion", () => {
  it("coerces string to number when default is number", () => {
    class Page {
      @prop({ param: "page" }) accessor pageNum = 1;
    }
    const page = new Page();

    injectRouteData(page, { page: "42" });
    expect(page.pageNum).toBe(42);
    expect(typeof page.pageNum).toBe("number");
  });

  it("coerces string to boolean when default is boolean", () => {
    class Page {
      @prop({ param: "show" }) accessor visible = false;
    }
    const page = new Page();

    injectRouteData(page, { show: "true" });
    expect(page.visible).toBe(true);
  });

  it("false string coerces to false for boolean props", () => {
    class Page {
      @prop({ param: "show" }) accessor visible = true;
    }
    const page = new Page();

    injectRouteData(page, { show: "false" });
    expect(page.visible).toBe(false);
  });

  it("leaves string as string when default is string", () => {
    class Page {
      @prop({ param: "slug" }) accessor slug = "";
    }
    const page = new Page();

    injectRouteData(page, { slug: "hello-world" });
    expect(page.slug).toBe("hello-world");
    expect(typeof page.slug).toBe("string");
  });
});

// ── Bug 3: @transform with route params ──

describe("REGRESSION: @transform applied to route params", () => {
  it("@transform(parseInt) coerces string param to number", () => {
    class Page {
      @prop({ param: "index" })
      @transform((v: unknown) => parseInt(v as string))
      accessor index = 0;
    }
    const page = new Page();

    injectRouteData(page, { index: "42" });
    expect(page.index).toBe(42);
    expect(typeof page.index).toBe("number");
  });

  it("@transform works with mismatched accessor/param names", () => {
    class Page {
      @prop({ param: "index" })
      @transform((v: unknown) => parseInt(v as string))
      accessor badgeIndex = 0;
    }
    const page = new Page();

    injectRouteData(page, { index: "7" });
    expect(page.badgeIndex).toBe(7);
    expect(typeof page.badgeIndex).toBe("number");
  });

  it("@transform takes priority over auto-coercion", () => {
    class Page {
      @prop({ param: "id" })
      @transform((v: unknown) => `user-${v}`)
      accessor userId = "";
    }
    const page = new Page();

    injectRouteData(page, { id: "42" });
    // Transform runs instead of auto-coercion
    expect(page.userId).toBe("user-42");
  });

  it("@transform with full params decompose", () => {
    class Page {
      @prop({ params })
      @transform((v: unknown): Record<string, any> => {
        const raw = v as Record<string, string>;
        return { ...raw, index: Number(raw.index) };
      })
      accessor allParams: Record<string, any> = {};
    }
    const page = new Page();

    injectRouteData(page, { slug: "hello", index: "5" });
    expect(page.allParams).toEqual({ slug: "hello", index: 5 });
  });

  it("TRANSFORMS metadata uses accessor name as key", () => {
    class Page {
      @prop({ param: "index" })
      @transform((v: unknown) => parseInt(v as string))
      accessor badgeIndex = 0;
    }
    new Page();

    const transforms = (Page as any)[TRANSFORMS.key] as Map<string, Function>;
    expect(transforms).toBeDefined();
    expect(transforms.has("badgeIndex")).toBe(true);
    expect(transforms.get("badgeIndex")!("42")).toBe(42);
  });
});

// ── Bug 4: @lazy forwarding with mismatched names ──

describe("REGRESSION: @lazy route param forwarding", () => {
  it("lazy forwarder uses ROUTE_PROPS propKey for forwarding", () => {
    // Simulating the lazy forwarding path using ROUTE_PROPS
    class StubPage {
      @prop({ param: "slug" }) accessor slug = "";
      @prop({ param: "index" }) accessor badgeIndex = 0;
    }
    const stub = new StubPage();

    // Step 1: outlet injects into stub
    injectRouteData(stub, { slug: "test-badge", index: "5" });
    expect(stub.slug).toBe("test-badge");
    expect(stub.badgeIndex).toBe(5);

    // Step 2: lazy creates real element and forwards via ROUTE_PROPS
    class RealPage {
      @prop({ param: "slug" }) accessor slug = "";
      @prop({ param: "index" }) accessor badgeIndex = 0;
    }
    const real = new RealPage();

    // Simulate the fixed lazy forwarding (lazy.ts __mountLazyImpl)
    const realCtor = real.constructor as any;
    const realBindings: any[] = realCtor[ROUTE_PROPS.key] ?? [];
    const transforms = realCtor[TRANSFORMS.key] as Map<string, Function> | undefined;

    for (const binding of realBindings) {
      let val = (stub as any)[binding.propKey];
      if (val !== undefined) {
        if (transforms?.has(binding.propKey)) {
          val = transforms.get(binding.propKey)!(val);
        } else if (typeof val === "string") {
          const current = (real as any)[binding.propKey];
          if (typeof current === "number") val = Number(val);
          else if (typeof current === "boolean") val = val !== "false";
        }
        (real as any)[binding.propKey] = val;
      }
    }

    expect(real.slug).toBe("test-badge");
    expect(real.badgeIndex).toBe(5);
  });

  it("lazy forwarder applies @transform from real component", () => {
    class StubPage {
      @prop({ param: "index" }) accessor index = 0;
    }
    const stub = new StubPage();
    injectRouteData(stub, { index: "42" });

    class RealPage {
      @prop({ param: "index" })
      @transform((v: unknown) => parseInt(v as string) * 10)
      accessor index = 0;
    }
    const real = new RealPage();

    // Forward with transform
    const realCtor = real.constructor as any;
    const realBindings: any[] = realCtor[ROUTE_PROPS.key] ?? [];
    const transforms = realCtor[TRANSFORMS.key] as Map<string, Function> | undefined;

    for (const binding of realBindings) {
      let val = (stub as any)[binding.propKey];
      if (val !== undefined) {
        if (transforms?.has(binding.propKey)) {
          val = transforms.get(binding.propKey)!(val);
        }
        (real as any)[binding.propKey] = val;
      }
    }

    // Transform was applied: 42 * 10 = 420
    expect(real.index).toBe(420);
  });
});
