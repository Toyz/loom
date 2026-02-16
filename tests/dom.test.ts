/**
 * Tests: @query and @queryAll — lazy shadow DOM selectors
 *
 * Note: @query/@queryAll define prototype getters. Field initializers
 * shadow prototype getters, so we must NOT declare default field values.
 * Use `declare` keyword or `!:` assertion.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { query, queryAll } from "../src/element/decorators";

let tagCounter = 0;
function nextTag() { return `test-dom-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("@query", () => {
  it("returns element matching selector", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      declare btn: HTMLButtonElement | null;
      update() {
        const btn = document.createElement("button");
        btn.className = "submit-btn";
        btn.textContent = "Go";
        return btn;
      }
    }
    query(".submit-btn")(El.prototype, "btn");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(el.btn).toBeTruthy();
    expect(el.btn.textContent).toBe("Go");
  });

  it("returns null when no match", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      declare missing: Element | null;
      update() {
        return document.createElement("div");
      }
    }
    query(".nope")(El.prototype, "missing");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(el.missing).toBeNull();
  });
});

describe("@queryAll", () => {
  it("returns array of matching elements", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      declare items: HTMLElement[];
      update() {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < 3; i++) {
          const span = document.createElement("span");
          span.className = "item";
          span.textContent = `item-${i}`;
          frag.appendChild(span);
        }
        return frag;
      }
    }
    queryAll(".item")(El.prototype, "items");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(el.items).toHaveLength(3);
    expect(Array.isArray(el.items)).toBe(true);
  });

  it("returns empty array when no matches", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      declare items: HTMLElement[];
      update() {
        return document.createElement("div");
      }
    }
    queryAll(".nope")(El.prototype, "items");
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(el.items).toHaveLength(0);
    expect(Array.isArray(el.items)).toBe(true);
  });
});
