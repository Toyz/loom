/**
 * Tests: @dropzone selector mode — dragleave child-crossing edge cases
 *
 * The core bug: dragleave fires when the pointer moves from the matched
 * element into one of its children. `closest(selector)` still resolves, so
 * without the relatedTarget guard the drag-over class is removed and
 * currentOverTarget is nulled even though the drag is still physically over
 * the element.
 *
 * Fix: `!target.contains(e.relatedTarget)` — only clear state when actually
 * leaving the matched element's boundary.
 *
 * Test infrastructure notes:
 *  - Items are appended to `el.shadowRoot ?? el` (same tree the handler listens on).
 *  - Events are dispatched DIRECTLY on the item elements so:
 *      • `e.target` is set naturally by the browser/happy-dom to the item
 *      • `item.closest(selector)` resolves correctly in the handler
 *  - For dragleave, `relatedTarget` is set via Object.defineProperty (happy-dom
 *    doesn't override it for synthetic events).
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement } from "../src/element";
import { dropzone } from "../src/element/dnd";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-dnd-sel-${++tagCounter}`; }

afterEach(() => cleanup());

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Put elements into the same shadow/light tree as the dropzone handler. */
function getRoot(el: Element): Element {
  return el.shadowRoot ?? el;
}

/** Dispatch dragover directly on target so e.target is set naturally. */
function dragover(target: Element) {
  const e = new Event("dragover", { cancelable: true, bubbles: true }) as any;
  e.dataTransfer = { dropEffect: "none" };
  target.dispatchEvent(e);
}

/**
 * Dispatch dragleave directly on fromEl (pointer leaving it) with
 * relatedTarget pointing to where the pointer moved.
 */
function dragleave(fromEl: Element, toEl: Element | null) {
  const e = new Event("dragleave", { cancelable: true, bubbles: true }) as any;
  e.dataTransfer = {};
  Object.defineProperty(e, "relatedTarget", { value: toEl, configurable: true });
  fromEl.dispatchEvent(e);
}

/** Dispatch a drop event directly on target. */
function drop(target: Element, getData: (type: string) => string = () => "payload") {
  const e = new Event("drop", { cancelable: true, bubbles: true }) as any;
  e.dataTransfer = { getData };
  target.dispatchEvent(e);
  return e;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE BUG: child crossing
// ═══════════════════════════════════════════════════════════════════════════════

describe("@dropzone selector — dragleave child crossing (core bug)", () => {

  it("dragleave into a child does NOT remove overClass", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const child = document.createElement("span");
    item.appendChild(child);
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    // Pointer moves into the child — dragleave fires with relatedTarget = child
    dragleave(item, child);

    // Should still have drag-over — still physically over .item
    expect(item.classList.contains("drag-over")).toBe(true);

    el.remove();
  });

  it("dragleave out of the matched element removes overClass", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const outside = document.createElement("div");
    root.appendChild(item);
    root.appendChild(outside);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    // relatedTarget is outside — genuine leave
    dragleave(item, outside);
    expect(item.classList.contains("drag-over")).toBe(false);

    el.remove();
  });

  it("dragleave with null relatedTarget (leaving viewport) removes overClass", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    dragleave(item, null);
    expect(item.classList.contains("drag-over")).toBe(false);

    el.remove();
  });

  it("consecutive child crossings don't remove overClass at any point", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const child1 = document.createElement("span");
    const child2 = document.createElement("em");
    item.appendChild(child1);
    item.appendChild(child2);
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    // Cross child1 → child2 → child1 — class must remain throughout
    dragleave(item, child1);
    expect(item.classList.contains("drag-over")).toBe(true);

    dragover(child1);
    dragleave(item, child2);
    expect(item.classList.contains("drag-over")).toBe(true);

    dragover(child2);
    dragleave(item, child1);
    expect(item.classList.contains("drag-over")).toBe(true);

    el.remove();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// currentOverTarget STATE INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("@dropzone selector — currentOverTarget state integrity", () => {

  it("drop after child crossing still delivers correct target", () => {
    const tag = nextTag();
    let droppedTarget: Element | null = null;

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item" })
      onDrop(_data: string, _e: DragEvent, target: Element) {
        droppedTarget = target;
      }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const child = document.createElement("span");
    item.appendChild(child);
    root.appendChild(item);

    dragover(item);
    dragleave(item, child); // child crossing — must not corrupt state
    dragover(child);        // re-enter via child
    drop(child);            // drop on child

    expect(droppedTarget).toBe(item); // closest(".item") from child = item

    el.remove();
  });

  it("overClass cleared on drop even after child crossings", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const child = document.createElement("span");
    item.appendChild(child);
    root.appendChild(item);

    dragover(item);
    dragleave(item, child);
    dragover(child);
    drop(child);

    expect(item.classList.contains("drag-over")).toBe(false);

    el.remove();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-TARGET DELEGATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("@dropzone selector — multi-target delegation", () => {

  it("moving from one target to another clears first and sets second", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item1 = document.createElement("div");
    item1.className = "item";
    const item2 = document.createElement("div");
    item2.className = "item";
    root.appendChild(item1);
    root.appendChild(item2);

    dragover(item1);
    expect(item1.classList.contains("drag-over")).toBe(true);
    expect(item2.classList.contains("drag-over")).toBe(false);

    // Genuine leave to item2 (item2 is not a descendant of item1)
    dragleave(item1, item2);
    dragover(item2);

    expect(item1.classList.contains("drag-over")).toBe(false);
    expect(item2.classList.contains("drag-over")).toBe(true);

    el.remove();
  });

  it("only one item has overClass at a time across rapid switches", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const items = [0, 1, 2].map(() => {
      const div = document.createElement("div");
      div.className = "item";
      root.appendChild(div);
      return div;
    });

    for (let i = 0; i < items.length; i++) {
      dragover(items[i]);
      const withClass = items.filter(it => it.classList.contains("drag-over"));
      expect(withClass).toHaveLength(1);
      expect(withClass[0]).toBe(items[i]);
    }

    el.remove();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// DROP CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════════

describe("@dropzone selector — drop correctness", () => {

  it("drop delivers data string via method argument", () => {
    const tag = nextTag();
    let received = "";

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", accept: "text/plain" })
      onDrop(data: string) { received = data; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    root.appendChild(item);

    dragover(item);
    drop(item, type => type === "text/plain" ? "my-data" : "");

    expect(received).toBe("my-data");

    el.remove();
  });

  it("drop on child delivers closest matched target as third arg", () => {
    const tag = nextTag();
    let droppedTarget: Element | null = null;

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item" })
      onDrop(_d: string, _e: DragEvent, target: Element) {
        droppedTarget = target;
      }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const child = document.createElement("span");
    item.appendChild(child);
    root.appendChild(item);

    dragover(item);
    drop(child);

    expect(droppedTarget).toBe(item);

    el.remove();
  });

  it("dragover then immediate drop (no child crossing) — clean flow", () => {
    const tag = nextTag();
    let received = "";

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(data: string) { received = data; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    drop(item, () => "clean-drop");

    expect(received).toBe("clean-drop");
    expect(item.classList.contains("drag-over")).toBe(false);

    el.remove();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("@dropzone selector — relatedTarget edge cases", () => {

  it("relatedTarget outside the component is treated as genuine leave", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_d: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    // document.body is not a descendant of item
    dragleave(item, document.body);
    expect(item.classList.contains("drag-over")).toBe(false);

    el.remove();
  });

  it("relatedTarget = the matched element itself keeps overClass (contains(self) = true)", () => {
    // Pathological: relatedTarget === target. Node.contains(self) = true → no clear.
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_d: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    root.appendChild(item);

    dragover(item);
    dragleave(item, item); // relatedTarget === item itself
    expect(item.classList.contains("drag-over")).toBe(true);

    el.remove();
  });

  it("deeply nested child crossing — overClass preserved", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_d: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const level1 = document.createElement("div");
    const level2 = document.createElement("span");
    const level3 = document.createElement("em");
    level2.appendChild(level3);
    level1.appendChild(level2);
    item.appendChild(level1);
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("drag-over")).toBe(true);

    dragleave(item, level3); // deeply nested child
    expect(item.classList.contains("drag-over")).toBe(true);

    el.remove();
  });

  it("no error when dragleave fires on element not matching selector", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_d: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const outsider = document.createElement("div"); // no .item class
    root.appendChild(outsider);

    expect(() => {
      dragleave(outsider, null);
    }).not.toThrow();

    el.remove();
  });

  it("custom overClass is respected and preserved on child crossing", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "hovered" })
      onDrop(_d: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item = document.createElement("div");
    item.className = "item";
    const child = document.createElement("span");
    item.appendChild(child);
    root.appendChild(item);

    dragover(item);
    expect(item.classList.contains("hovered")).toBe(true);

    // Child crossing — custom class must stay
    dragleave(item, child);
    expect(item.classList.contains("hovered")).toBe(true);

    // Genuine leave — custom class removed
    dragleave(item, null);
    expect(item.classList.contains("hovered")).toBe(false);

    el.remove();
  });

  it("multiple items — child crossing on one doesn't affect the other's class", () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ selector: ".item", overClass: "drag-over" })
      onDrop(_d: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    const root = getRoot(el);

    const item1 = document.createElement("div");
    item1.className = "item";
    const child1 = document.createElement("span");
    item1.appendChild(child1);

    const item2 = document.createElement("div");
    item2.className = "item";

    root.appendChild(item1);
    root.appendChild(item2);

    // Hover item1, cross into its child, then genuinely leave to item2
    dragover(item1);
    dragleave(item1, child1); // child crossing — item1 class stays
    expect(item1.classList.contains("drag-over")).toBe(true);
    expect(item2.classList.contains("drag-over")).toBe(false);

    // Now genuinely leave item1 to item2
    dragleave(item1, item2);
    dragover(item2);

    expect(item1.classList.contains("drag-over")).toBe(false);
    expect(item2.classList.contains("drag-over")).toBe(true);

    el.remove();
  });

});
