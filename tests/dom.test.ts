/**
 * Tests: @query and @queryAll — lazy shadow DOM selectors (TC39 auto-accessor)
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { query, queryAll } from "../src/element/decorators";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-dom-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@query", () => {
  it("returns element matching selector", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @query(".submit-btn") accessor btn!: HTMLButtonElement | null;
      update() {
        const btn = document.createElement("button");
        btn.className = "submit-btn";
        btn.textContent = "Go";
        return btn;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(el.btn).toBeTruthy();
    expect(el.btn!.textContent).toBe("Go");
  });

  it("returns null when no match", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @query(".nope") accessor missing!: Element | null;
      update() {
        return document.createElement("div");
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(el.missing).toBeNull();
  });
});

describe("@queryAll", () => {
  it("returns array of matching elements", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @queryAll(".item") accessor items!: HTMLElement[];
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
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(el.items).toHaveLength(3);
    expect(Array.isArray(el.items)).toBe(true);
  });

  it("returns empty array when no matches", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @queryAll(".nope") accessor items!: HTMLElement[];
      update() {
        return document.createElement("div");
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);

    expect(el.items).toHaveLength(0);
    expect(Array.isArray(el.items)).toBe(true);
  });
});
