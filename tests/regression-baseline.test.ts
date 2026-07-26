/**
 * Characterization baseline for the 0.22.0 hardening sweep.
 *
 * Every test here asserts the CORRECT behavior and is marked `it.fails`,
 * because the current code gets it wrong. As each phase lands, the matching
 * `it.fails` flips to a plain `it` — a test that goes green while still marked
 * `.fails` is reported by vitest as a failure, so nothing can be fixed
 * silently and nothing can regress back afterwards.
 *
 * Four cross-cutting behaviors, one per root cause:
 *   1. subclass metadata isolation        → Phase 1
 *   2. ROUTE_PROPS per-instance growth    → Phase 1
 *   3. uncontrolled form state vs morph   → Phase 5
 *   4. guard returning err(Error) blocks  → Phase 7A
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { component } from "../src/element/decorators";
import { prop, reactive } from "../src/store/decorators";
import { transform } from "../src/transform/transform";
import { PROPS, REACTIVES, ROUTE_PROPS, TRANSFORMS } from "../src/decorators/symbols";
import { morph } from "../src/morph";
import { LoomResult } from "../src/result";
import { routes, guardRegistry, routeByName } from "../src/router/route";
import { route, guard } from "../src/router/decorators";
import { LoomRouter, type RouteInfo } from "../src/router/router";
import type { RouterMode } from "../src/router/mode";
import { cleanup } from "../src/testing";

let tagCounter = 0;
const nextTag = () => `baseline-el-${++tagCounter}`;

afterEach(() => cleanup());

// ═══════════════════════════════════════════════════════════════════════════
// 1. Decorator metadata must not leak between sibling subclasses
// ═══════════════════════════════════════════════════════════════════════════

describe("baseline: subclass metadata isolation (Phase 1)", () => {
  it("@prop on two sibling subclasses does not cross-contaminate", () => {
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

    const leftAttrs = (Left as any).observedAttributes as string[];
    const rightAttrs = (Right as any).observedAttributes as string[];

    expect(leftAttrs).toContain("onlyleft");
    expect(leftAttrs).not.toContain("onlyright");
    expect(rightAttrs).toContain("onlyright");
    expect(rightAttrs).not.toContain("onlyleft");

    // The base must be untouched by either child.
    const baseMap = PROPS.from(Base) as Map<string, string>;
    expect([...baseMap.keys()]).toEqual(["shared"]);
  });

  // Plain classes, not LoomElement subclasses: `new` on an unregistered custom
  // element throws "Illegal constructor", which would make these pass for the
  // wrong reason. The metadata decorators only touch `this.constructor`, so a
  // plain class exercises exactly the same code path.
  it("@reactive on a subclass does not append to the base's REACTIVES", () => {
    class Base {
      @reactive accessor a = 1;
    }
    class Sub extends Base {
      @reactive accessor b = 2;
    }

    new Base();
    new Sub();

    expect(REACTIVES.from(Base) as string[]).toEqual(["a"]);
    expect((REACTIVES.from(Sub) as string[]).slice().sort()).toEqual(["a", "b"]);
  });

  it("@transform on sibling subclasses keeps separate maps", () => {
    const toDate = (v: unknown) => new Date(String(v));

    class Page {
      accessor value: unknown = null;
    }
    class NumPage extends Page {
      @transform(Number) accessor value: unknown = 0;
    }
    class DatePage extends Page {
      @transform(toDate) accessor value: unknown = null;
    }

    new NumPage();
    new DatePage();

    // The shared parent must have picked up neither subclass's transform.
    expect(TRANSFORMS.from(Page)).toBeUndefined();
    expect((TRANSFORMS.from(NumPage) as Map<string, Function>).get("value")).toBe(Number);
    expect((TRANSFORMS.from(DatePage) as Map<string, Function>).get("value")).toBe(toDate);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. ROUTE_PROPS is class metadata, not per-instance accumulation
// ═══════════════════════════════════════════════════════════════════════════

describe("baseline: ROUTE_PROPS growth (Phase 1)", () => {
  it("registers one binding per declared prop, not one per instance", () => {
    // Plain class — see the note above on "Illegal constructor".
    class UserPage {
      @prop({ param: "id" }) accessor id = "";
    }

    for (let i = 0; i < 5; i++) new UserPage();

    const bindings = (ROUTE_PROPS.from(UserPage) ?? []) as Array<{ propKey: string }>;
    expect(bindings).toHaveLength(1);
    expect(bindings[0].propKey).toBe("id");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Morph must not clobber form state the template never declared
// ═══════════════════════════════════════════════════════════════════════════

describe("baseline: uncontrolled form state survives morph (Phase 5)", () => {
  function shadow(): ShadowRoot {
    return document.createElement("div").attachShadow({ mode: "open" });
  }

  it("preserves a user-typed value when JSX declared no value prop", () => {
    const root = shadow();

    const initial = document.createElement("div");
    initial.appendChild(document.createElement("input"));
    initial.appendChild(document.createElement("span")).textContent = "0";
    morph(root, initial);

    // User types into the live input.
    const live = root.querySelector("input")!;
    live.value = "hello";

    // Unrelated re-render: a fresh tree with a default-valued <input>.
    const next = document.createElement("div");
    next.appendChild(document.createElement("input"));
    next.appendChild(document.createElement("span")).textContent = "1";
    morph(root, next);

    expect(root.querySelector("span")!.textContent).toBe("1");
    expect(root.querySelector("input")!.value).toBe("hello");
  });

  it("preserves a user-toggled checkbox the template never declared", () => {
    const root = shadow();

    const mk = (label: string) => {
      const wrap = document.createElement("div");
      const box = document.createElement("input");
      box.type = "checkbox";
      wrap.appendChild(box);
      wrap.appendChild(document.createElement("span")).textContent = label;
      return wrap;
    };

    morph(root, mk("a"));
    root.querySelector("input")!.checked = true;
    morph(root, mk("b"));

    expect(root.querySelector("span")!.textContent).toBe("b");
    expect(root.querySelector("input")!.checked).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. A guard returning LoomResult.err(Error) must BLOCK, not allow
// ═══════════════════════════════════════════════════════════════════════════

class MockMode implements RouterMode {
  path: string;
  constructor(initial = "/") { this.path = initial; }
  read(): string { return this.path; }
  write(p: string): void { this.path = p; }
  replace(p: string): void { this.path = p; }
  listen(_cb: () => void): () => void { return () => {}; }
  href(p: string): string { return p; }
}

class TestRouter extends LoomRouter {
  constructor(mock: MockMode) {
    super();
    (this as any).mode = mock;
  }
  get currentPath(): string { return this.current.path; }
}

describe("baseline: guard error blocks navigation (Phase 7A)", () => {
  beforeEach(() => {
    routes.length = 0;
    guardRegistry.clear();
    routeByName.clear();
  });

  it("LoomResult.err(new Error(...)) denies the route", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("err_object")
      check(_r: RouteInfo) { return LoomResult.err(new Error("not authorized")); }
    }
    new G();

    @route("/admin", { guards: ["err_object"] })
    class Admin {}

    @route("/")
    class Home {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise((r) => setTimeout(r, 0));

    await router.go("/admin");

    expect(router.currentPath).not.toBe("/admin");
    expect(mock.path).not.toBe("/admin");
  });
});
