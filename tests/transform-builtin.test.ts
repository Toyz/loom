/**
 * Tests: the built-in transform decorators exported from @toyz/loom/transform.
 *
 * First coverage for these. All seven were built on a createTransform that
 * used the legacy `(prototype, key)` decorator signature while the project
 * compiles TC39 stage-3 decorators (no experimentalDecorators in tsconfig).
 * Stage 3 calls a decorator as `(value, context)`, so on a plain field
 * `proto.constructor` threw at class-definition time, and on an `accessor` the
 * transform was registered onto `Object` under a key that was the context
 * object. Nothing ever reached TRANSFORMS.
 *
 * Two consumers read TRANSFORMS, so both are exercised:
 *   - @component's attributeChangedCallback (element/decorators.ts)
 *   - LoomOutlet._injectRouteData          (router/outlet.ts)
 */

import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { prop } from "../src/store/decorators";
import {
  toNumber, toBoolean, toDate, toJSON, toTrimmed, toInt, toFloat,
} from "../src/transform/built-in";
import { createTransform } from "../src/transform/create";
import { typed, typedTransformer } from "../src/transform/typed";
import { TRANSFORMS } from "../src/decorators/symbols";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
const nextTag = () => `xform-el-${++tagCounter}`;

afterEach(() => cleanup());

describe("built-in transforms via attributeChangedCallback", () => {
  it("@toNumber coerces the attribute string to a number", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toNumber accessor userId = 0;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("userid", "42");
    expect(el.userId).toBe(42);
    expect(typeof el.userId).toBe("number");
  });

  it("@toBoolean maps only 'true' and '1' to true", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toBoolean accessor active = false;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("active", "true");
    expect(el.active).toBe(true);
    el.setAttribute("active", "1");
    expect(el.active).toBe(true);
    el.setAttribute("active", "yes");
    expect(el.active).toBe(false);
  });

  it("@toDate parses an ISO string into a Date", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toDate accessor createdAt: Date = new Date(0);
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("createdat", "2024-03-01T00:00:00.000Z");
    expect(el.createdAt).toBeInstanceOf(Date);
    expect(el.createdAt.toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });

  it("@toJSON parses a JSON attribute", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toJSON accessor config: any = null;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("config", '{"theme":"dark","depth":2}');
    expect(el.config).toEqual({ theme: "dark", depth: 2 });
  });

  it("@toTrimmed strips surrounding whitespace", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toTrimmed accessor label = "";
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("label", "   spaced   ");
    expect(el.label).toBe("spaced");
  });

  it("@toInt truncates via parseInt base 10", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toInt accessor count = 0;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("count", "42.9px");
    expect(el.count).toBe(42);
  });

  it("@toFloat parses a leading float", async () => {
    const tag = nextTag();
    @component(tag)
    class El extends LoomElement {
      @prop @toFloat accessor ratio = 0;
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("ratio", "0.625rem");
    expect(el.ratio).toBeCloseTo(0.625);
  });
});

describe("createTransform", () => {
  it("registers the transform on the declaring class", () => {
    const upper = createTransform<string, string>((v) => v.toUpperCase());

    class Holder {
      @upper accessor name = "";
    }
    new Holder();

    expect((TRANSFORMS.from(Holder) as Map<string, Function>).get("name")).toBeTypeOf("function");
  });

  it("does not leak a subclass transform onto its base", () => {
    const a = createTransform<string, string>((v) => `a:${v}`);
    const b = createTransform<string, string>((v) => `b:${v}`);

    class Base { @a accessor v = ""; }
    class Sub extends Base { @b accessor w = ""; }

    new Base();
    new Sub();

    expect([...(TRANSFORMS.from(Base) as Map<string, Function>).keys()]).toEqual(["v"]);
    expect([...(TRANSFORMS.from(Sub) as Map<string, Function>).keys()].sort()).toEqual(["v", "w"]);
  });

  it("a custom transform runs through attributeChangedCallback", async () => {
    const tag = nextTag();
    const csv = createTransform<string, string[]>((v) => v.split(","));

    @component(tag)
    class El extends LoomElement {
      @prop @csv accessor tags: string[] = [];
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    el.setAttribute("tags", "a,b,c");
    expect(el.tags).toEqual(["a", "b", "c"]);
  });
});

describe("typed / typedTransformer", () => {
  it("typed() builds a schema mapper over a raw record", () => {
    const fn = typed<{ id: number; name: string }>({
      id: Number as unknown as (v: string) => number,
      name: String as unknown as (v: string) => string,
    });
    expect(fn({ id: "7", name: "ada" })).toEqual({ id: 7, name: "ada" });
  });

  it("typed() skips keys absent from the raw record", () => {
    const fn = typed<{ id: number; page: number }>({
      id: Number as unknown as (v: string) => number,
      page: Number as unknown as (v: string) => number,
    });
    expect(fn({ id: "7" })).toEqual({ id: 7 });
  });

  it("@typedTransformer registers a schema transform on the class", () => {
    class Page {
      @typedTransformer<{ id: number }>({ id: Number as unknown as (v: string) => number })
      accessor routeParams: any = {};
    }
    new Page();

    const fn = (TRANSFORMS.from(Page) as Map<string, Function>).get("routeParams")!;
    expect(fn({ id: "12" })).toEqual({ id: 12 });
  });
});

describe("transforms via route param injection", () => {
  it("@prop({param}) + @toNumber coerces an injected route param", async () => {
    const tag = nextTag();

    @component(tag)
    class Page extends LoomElement {
      @prop({ param: "id" }) @toNumber accessor userId = 0;
    }
    customElements.define(tag, Page);

    const el = await fixture<Page>(tag);
    // Mirrors LoomOutlet._injectRouteData: look up TRANSFORMS, apply, assign.
    const transforms = TRANSFORMS.from(Page) as Map<string, Function>;
    (el as any).userId = transforms.get("userId")!("99");

    expect(el.userId).toBe(99);
    expect(typeof el.userId).toBe("number");
  });
});
