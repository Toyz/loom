/**
 * Integration test: Route param injection with REAL custom elements.
 *
 * Note: @component queues via app.register, so we must also call
 * customElements.define() manually (matching existing test patterns).
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { prop } from "../src/store/decorators";
import { transform } from "../src/transform/transform";
import { ROUTE_PROPS, TRANSFORMS } from "../src/decorators/symbols";
import { params as paramsSentinel } from "../src/store/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 200;
function nextTag() { return `test-rp-ce-${++tagCounter}`; }

afterEach(() => cleanup());

/**
 * Simulate what outlet._injectRouteData does (matches real outlet code).
 */
function injectRouteData(el: any, routeParams: Record<string, string>) {
  const ctor = el.constructor as any;
  const routeBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
  const transforms = ctor[TRANSFORMS.key] as Map<string, Function> | undefined;
  const boundParamKeys = new Set<string>();

  for (const binding of routeBindings) {
    let value: any;

    if (typeof binding.param === "string") {
      value = routeParams[binding.param] ?? "";
      boundParamKeys.add(binding.param);
    }

    // Apply @transform if registered
    if (transforms?.has(binding.propKey) && value !== undefined) {
      value = transforms.get(binding.propKey)!(value);
    } else if (typeof value === "string") {
      const current = (el as any)[binding.propKey];
      if (typeof current === "number") value = Number(value);
      else if (typeof current === "boolean") value = value !== "false";
    }

    if (value !== undefined) {
      (el as any)[binding.propKey] = value;
    }
  }

  // Backward compat: set unbound params as attributes
  for (const [key, val] of Object.entries(routeParams)) {
    if (!boundParamKeys.has(key)) {
      el.setAttribute(key, val);
    }
  }

  return { boundParamKeys };
}

describe("route params with real custom elements", () => {
  it("@prop({ param }) with matching accessor name works", () => {
    const tag = nextTag();

    @component(tag)
    class TestPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
    }
    customElements.define(tag, TestPage);

    const el = document.createElement(tag) as any;

    // Verify the auto-accessor is alive
    console.log("[diag] el.slug default:", el.slug);
    console.log("[diag] el.constructor === TestPage:", el.constructor === TestPage);
    console.log("[diag] ROUTE_PROPS:", (el.constructor as any)[ROUTE_PROPS.key]);

    injectRouteData(el, { slug: "hello" });
    expect(el.slug).toBe("hello");
    el.remove();
  });

  it("@prop({ param }) with MISMATCHED accessor name", () => {
    const tag = nextTag();

    @component(tag)
    class TestPage extends LoomElement {
      @prop({ param: "index" }) accessor badgeIndex = 0;
    }
    customElements.define(tag, TestPage);

    const el = document.createElement(tag) as any;

    console.log("[diag] el.badgeIndex default:", el.badgeIndex);
    console.log("[diag] ROUTE_PROPS:", (el.constructor as any)[ROUTE_PROPS.key]);
    console.log("[diag] TRANSFORMS:", (el.constructor as any)[TRANSFORMS.key]);

    injectRouteData(el, { index: "5" });
    console.log("[diag] el.badgeIndex after inject:", el.badgeIndex);

    expect(el.badgeIndex).toBe(5);
    el.remove();
  });

  it("@transform should coerce param to number", () => {
    const tag = nextTag();

    @component(tag)
    class TestPage extends LoomElement {
      @prop({ param: "index" })
      @transform((v: unknown) => parseInt(v as string))
      accessor index = 0;
    }
    customElements.define(tag, TestPage);

    const el = document.createElement(tag) as any;
    injectRouteData(el, { index: "42" });
    expect(el.index).toBe(42);
    el.remove();
  });

  it("@transform with mismatched name", () => {
    const tag = nextTag();

    @component(tag)
    class TestPage extends LoomElement {
      @prop({ param: "index" })
      @transform((v: unknown) => parseInt(v as string))
      accessor badgeIndex = 0;
    }
    customElements.define(tag, TestPage);

    const el = document.createElement(tag) as any;
    injectRouteData(el, { index: "7" });
    expect(el.badgeIndex).toBe(7);
    el.remove();
  });

  it("multiple params with mixed matching/mismatched names", () => {
    const tag = nextTag();

    @component(tag)
    class TestPage extends LoomElement {
      @prop({ param: "slug" }) accessor slug = "";
      @prop({ param: "index" }) accessor badgeIndex = 0;
    }
    customElements.define(tag, TestPage);

    const el = document.createElement(tag) as any;
    injectRouteData(el, { slug: "test-badge", index: "3" });
    expect(el.slug).toBe("test-badge");
    expect(el.badgeIndex).toBe(3);
    el.remove();
  });
});
