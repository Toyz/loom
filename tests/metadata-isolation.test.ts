/**
 * Tests: decorator metadata is OWN to the class that declares it.
 *
 * `LoomSymbol.from()` is a plain property read, so it walks the prototype
 * chain — and class constructors inherit from their superclass constructor.
 * Reading metadata that way and then mutating it in place made a subclass
 * write into its base's array/Map, so every sibling subclass saw the union of
 * all their fields. `ownArray`/`ownMap` copy-on-inherit instead.
 *
 * Plain classes are used wherever the test constructs an instance: `new` on an
 * unregistered custom element throws "Illegal constructor", which would make
 * these pass for the wrong reason. The decorators only touch
 * `this.constructor`, so a plain class exercises the same path.
 */

import { describe, it, expect } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { prop, reactive, computed } from "../src/store/decorators";
import { signal } from "../src/store/signal";
import { transform } from "../src/transform/transform";
import { onRouteEnter, onRouteLeave } from "../src/router/route-lifecycle";
import {
  createSymbol, REACTIVES, PROPS, ROUTE_PROPS, TRANSFORMS,
  COMPUTED_DIRTY, ROUTE_ENTER, ROUTE_LEAVE,
} from "../src/decorators/symbols";

let tagCounter = 0;
const nextTag = () => `meta-iso-${++tagCounter}`;

describe("LoomSymbol.ownArray / ownMap", () => {
  it("ownArray copies the inherited array instead of aliasing it", () => {
    const SYM = createSymbol<string[]>(`test:ownArray:${Math.random()}`);
    class Base {}
    class Sub extends Base {}

    SYM.ownArray<string>(Base).push("base");
    const subArr = SYM.ownArray<string>(Sub);
    subArr.push("sub");

    expect(SYM.from(Base)).toEqual(["base"]);
    expect(SYM.from(Sub)).toEqual(["base", "sub"]);
    expect(SYM.from(Base)).not.toBe(SYM.from(Sub));
  });

  it("ownMap copies the inherited Map instead of aliasing it", () => {
    const SYM = createSymbol<Map<string, number>>(`test:ownMap:${Math.random()}`);
    class Base {}
    class Sub extends Base {}

    SYM.ownMap<string, number>(Base).set("a", 1);
    SYM.ownMap<string, number>(Sub).set("b", 2);

    expect([...(SYM.from(Base) as Map<string, number>).keys()]).toEqual(["a"]);
    expect([...(SYM.from(Sub) as Map<string, number>).keys()]).toEqual(["a", "b"]);
  });

  it("is idempotent — repeated calls return the same own array", () => {
    const SYM = createSymbol<string[]>(`test:idem:${Math.random()}`);
    class C {}
    expect(SYM.ownArray(C)).toBe(SYM.ownArray(C));
  });

  it("stores metadata non-enumerably", () => {
    const SYM = createSymbol<string[]>(`test:enum:${Math.random()}`);
    class C {}
    SYM.ownArray(C).push("x");
    expect(Object.getOwnPropertyDescriptor(C, SYM.key)?.enumerable).toBe(false);
  });

  it("hasOwn distinguishes own from inherited", () => {
    const SYM = createSymbol<string[]>(`test:hasOwn:${Math.random()}`);
    class Base {}
    class Sub extends Base {}
    SYM.ownArray(Base);

    expect(SYM.hasOwn(Base)).toBe(true);
    expect(SYM.hasOwn(Sub)).toBe(false);
    expect(SYM.has(Sub)).toBe(true); // still visible through the chain
  });
});

describe("@prop / @component — PROPS isolation", () => {
  it("sibling subclasses get disjoint observedAttributes", () => {
    @component(nextTag())
    class Base extends LoomElement {
      @prop accessor shared = "";
    }
    @component(nextTag())
    class Left extends Base {
      @prop accessor onlyLeft = "";
    }
    @component(nextTag())
    class Right extends Base {
      @prop accessor onlyRight = "";
    }

    expect((Left as any).observedAttributes.sort()).toEqual(["onlyleft", "shared"]);
    expect((Right as any).observedAttributes.sort()).toEqual(["onlyright", "shared"]);
    expect([...(PROPS.from(Base) as Map<string, string>).keys()]).toEqual(["shared"]);
  });

  it("a subclass inherits the base's props without mutating the base", () => {
    @component(nextTag())
    class Base extends LoomElement {
      @prop accessor a = "";
    }
    @component(nextTag())
    class Sub extends Base {
      @prop accessor b = "";
    }

    expect((Sub as any).observedAttributes.sort()).toEqual(["a", "b"]);
    expect((Base as any).observedAttributes).toEqual(["a"]);
  });
});

describe("@reactive / @signal — REACTIVES isolation", () => {
  it("keeps subclass fields out of the base's list", () => {
    class Base { @reactive accessor a = 1; }
    class Sub extends Base { @reactive accessor b = 2; }

    new Base();
    new Sub();

    expect(REACTIVES.from(Base)).toEqual(["a"]);
    expect((REACTIVES.from(Sub) as string[]).slice().sort()).toEqual(["a", "b"]);
  });

  it("two sibling subclasses do not see each other's fields", () => {
    class Base { @reactive accessor base = 0; }
    class L extends Base { @reactive accessor left = 0; }
    class R extends Base { @reactive accessor right = 0; }

    new L();
    new R();

    expect(REACTIVES.from(L)).not.toContain("right");
    expect(REACTIVES.from(R)).not.toContain("left");
  });

  it("@signal registers into REACTIVES without leaking to the base", () => {
    class Base { @signal accessor a = 1; }
    class Sub extends Base { @signal accessor b = 2; }

    new Base();
    new Sub();

    expect(REACTIVES.from(Base)).toEqual(["a"]);
    expect((REACTIVES.from(Sub) as string[]).slice().sort()).toEqual(["a", "b"]);
  });

  it("does not duplicate a field when many instances are constructed", () => {
    class C { @reactive accessor n = 0; }
    for (let i = 0; i < 25; i++) new C();
    expect(REACTIVES.from(C)).toEqual(["n"]);
  });
});

describe("@prop({ param }) — ROUTE_PROPS", () => {
  it("registers one binding per declared prop, not one per instance", () => {
    class UserPage {
      @prop({ param: "id" }) accessor id = "";
      @prop({ query: "tab" }) accessor tab = "";
    }

    for (let i = 0; i < 50; i++) new UserPage();

    const bindings = ROUTE_PROPS.from(UserPage) as Array<{ propKey: string }>;
    expect(bindings.map((b) => b.propKey).sort()).toEqual(["id", "tab"]);
  });

  it("a subclass binding does not land in the base's array", () => {
    class BasePage { @prop({ param: "id" }) accessor id = ""; }
    class DetailPage extends BasePage { @prop({ param: "slug" }) accessor slug = ""; }

    new BasePage();
    new DetailPage();

    expect((ROUTE_PROPS.from(BasePage) as Array<{ propKey: string }>).map((b) => b.propKey))
      .toEqual(["id"]);
    expect((ROUTE_PROPS.from(DetailPage) as Array<{ propKey: string }>).map((b) => b.propKey).sort())
      .toEqual(["id", "slug"]);
  });
});

describe("@transform — TRANSFORMS isolation", () => {
  it("sibling subclasses keep independent transform maps", () => {
    const toDate = (v: unknown) => new Date(String(v));

    class Page { accessor value: unknown = null; }
    class NumPage extends Page { @transform(Number) accessor value: unknown = 0; }
    class DatePage extends Page { @transform(toDate) accessor value: unknown = null; }

    new NumPage();
    new DatePage();

    expect(TRANSFORMS.from(Page)).toBeUndefined();
    expect((TRANSFORMS.from(NumPage) as Map<string, Function>).get("value")).toBe(Number);
    expect((TRANSFORMS.from(DatePage) as Map<string, Function>).get("value")).toBe(toDate);
  });
});

describe("@computed — COMPUTED_DIRTY isolation", () => {
  it("a subclass's dirty key does not land on the base prototype", () => {
    class Base {
      @reactive accessor a = 1;
      @computed get double() { return this.a * 2; }
    }
    class Sub extends Base {
      @reactive accessor b = 1;
      @computed get triple() { return this.b * 3; }
    }

    new Base();
    new Sub();

    expect(COMPUTED_DIRTY.from(Base.prototype)).toHaveLength(1);
    expect(COMPUTED_DIRTY.from(Sub.prototype)).toHaveLength(2);
  });
});

describe("@onRouteEnter / @onRouteLeave — isolation", () => {
  it("a subclass hook does not register on the base prototype", () => {
    class BasePage {
      @onRouteEnter baseEnter() {}
    }
    class SubPage extends BasePage {
      @onRouteEnter subEnter() {}
      @onRouteLeave subLeave() {}
    }

    new BasePage();
    new SubPage();

    expect(ROUTE_ENTER.from(BasePage.prototype)).toEqual(["baseEnter"]);
    expect((ROUTE_ENTER.from(SubPage.prototype) as string[]).slice().sort())
      .toEqual(["baseEnter", "subEnter"]);
    expect(ROUTE_LEAVE.from(SubPage.prototype)).toEqual(["subLeave"]);
    expect(ROUTE_LEAVE.from(BasePage.prototype)).toBeUndefined();
  });

  it("does not duplicate hooks across many instances", () => {
    class P { @onRouteEnter entered() {} }
    for (let i = 0; i < 20; i++) new P();
    expect(ROUTE_ENTER.from(P.prototype)).toEqual(["entered"]);
  });
});
