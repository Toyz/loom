/**
 * Tests: DOM morphing — morph(), key preservation, loom-keep
 */
import { describe, it, expect, afterEach } from "vitest";
import { morph } from "../src/morph";

afterEach(() => {
  document.body.innerHTML = "";
});

/** Create a host shadow for testing */
function createHost(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

describe("morph()", () => {
  it("appends new nodes to empty container", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    div.textContent = "hello";
    morph(shadow, div);
    expect(shadow.childNodes).toHaveLength(1);
    expect(shadow.textContent).toBe("hello");
  });

  it("updates text content of existing nodes", () => {
    const shadow = createHost();
    const div1 = document.createElement("div");
    div1.textContent = "old";
    shadow.appendChild(div1);

    const div2 = document.createElement("div");
    div2.textContent = "new";
    morph(shadow, div2);

    expect(shadow.childNodes).toHaveLength(1);
    expect(shadow.textContent).toBe("new");
  });

  it("preserves keyed elements", () => {
    const shadow = createHost();

    // Initial render with two keyed items
    const a = document.createElement("div");
    a.setAttribute("loom-key", "a");
    a.textContent = "A";
    const b = document.createElement("div");
    b.setAttribute("loom-key", "b");
    b.textContent = "B";
    shadow.appendChild(a);
    shadow.appendChild(b);

    // Re-render with reversed order
    const a2 = document.createElement("div");
    a2.setAttribute("loom-key", "a");
    a2.textContent = "A-updated";
    const b2 = document.createElement("div");
    b2.setAttribute("loom-key", "b");
    b2.textContent = "B-updated";

    morph(shadow, [b2, a2]);

    // Keys should cause reuse of original DOM nodes
    expect(shadow.childNodes).toHaveLength(2);
    expect((shadow.childNodes[0] as Element).getAttribute("loom-key")).toBe("b");
    expect((shadow.childNodes[1] as Element).getAttribute("loom-key")).toBe("a");
  });

  it("preserves loom-keep elements", () => {
    const shadow = createHost();

    const keep = document.createElement("div");
    keep.setAttribute("loom-keep", "");
    keep.textContent = "preserved";
    shadow.appendChild(keep);

    const replacement = document.createElement("span");
    replacement.textContent = "new content";
    morph(shadow, replacement);

    // loom-keep element should survive
    const nodes = Array.from(shadow.childNodes);
    const kept = nodes.find(
      (n) => n instanceof Element && n.hasAttribute("loom-keep"),
    );
    expect(kept).toBeTruthy();
    expect((kept as Element).textContent).toBe("preserved");
  });

  it("removes old non-keyed nodes", () => {
    const shadow = createHost();

    for (let i = 0; i < 3; i++) {
      const span = document.createElement("span");
      span.textContent = `item-${i}`;
      shadow.appendChild(span);
    }

    const single = document.createElement("div");
    single.textContent = "only one";
    morph(shadow, single);

    expect(shadow.childNodes).toHaveLength(1);
    expect(shadow.textContent).toBe("only one");
  });

  it("handles fragment input", () => {
    const shadow = createHost();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 3; i++) {
      const li = document.createElement("li");
      li.textContent = `item-${i}`;
      frag.appendChild(li);
    }
    morph(shadow, frag);
    expect(shadow.childNodes).toHaveLength(3);
  });

  it("updates attributes", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    div.setAttribute("class", "old");
    shadow.appendChild(div);

    const updated = document.createElement("div");
    updated.setAttribute("class", "new");
    updated.setAttribute("id", "fresh");
    morph(shadow, updated);

    const el = shadow.firstChild as Element;
    expect(el.getAttribute("class")).toBe("new");
    expect(el.getAttribute("id")).toBe("fresh");
  });

  it("removes stale attributes", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    div.setAttribute("class", "old");
    div.setAttribute("data-stale", "yes");
    shadow.appendChild(div);

    const updated = document.createElement("div");
    updated.setAttribute("class", "new");
    morph(shadow, updated);

    const el = shadow.firstChild as Element;
    expect(el.hasAttribute("data-stale")).toBe(false);
  });

  it("patches event listeners via __loomEvents", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    const handler1 = () => { };
    div.addEventListener("click", handler1);
    const events1 = new Map([["click", handler1]]);
    (div as any).__loomEvents = events1;
    shadow.appendChild(div);

    // Morph with a new handler
    const div2 = document.createElement("div");
    const handler2 = () => { };
    div2.addEventListener("click", handler2);
    const events2 = new Map([["click", handler2]]);
    (div2 as any).__loomEvents = events2;

    morph(shadow, div2);

    // The old element should now have the new handler
    const el = shadow.firstChild as any;
    expect(el.__loomEvents.get("click")).toBe(handler2);
  });

  it("removes event listeners not in new tree", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    const handler = () => { };
    div.addEventListener("click", handler);
    (div as any).__loomEvents = new Map([["click", handler]]);
    shadow.appendChild(div);

    // Morph with no events
    const div2 = document.createElement("div");
    morph(shadow, div2);

    const el = shadow.firstChild as any;
    // Old events should be cleaned up
    const events = el.__loomEvents;
    if (events) {
      expect(events.has("click")).toBe(false);
    }
  });

  it("patches DOM properties (value, checked)", () => {
    const shadow = createHost();
    const input = document.createElement("input");
    (input as HTMLInputElement).value = "old";
    shadow.appendChild(input);

    const input2 = document.createElement("input");
    (input2 as HTMLInputElement).value = "new";
    morph(shadow, input2);

    expect((shadow.firstChild as HTMLInputElement).value).toBe("new");
  });

  it("patches JS properties via __loomProps", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    const oldItems = [1, 2, 3];
    (div as any).items = oldItems;
    (div as any).__loomProps = new Map([["items", oldItems]]);
    shadow.appendChild(div);

    const div2 = document.createElement("div");
    const newItems = [4, 5, 6];
    (div2 as any).items = newItems;
    (div2 as any).__loomProps = new Map([["items", newItems]]);
    morph(shadow, div2);

    const el = shadow.firstChild as any;
    expect(el.items).toEqual([4, 5, 6]);
  });

  it("skips child recursion for rawHTML elements", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    div.innerHTML = "<b>old</b>";
    shadow.appendChild(div);

    const div2 = document.createElement("div");
    div2.innerHTML = "<b>new</b>";
    (div2 as any).__loomRawHTML = true;
    morph(shadow, div2);

    const el = shadow.firstChild as Element;
    expect(el.innerHTML).toBe("<b>new</b>");
  });

  it("inserts instead of morphing when tag names differ", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    div.textContent = "I am a div";
    shadow.appendChild(div);

    const span = document.createElement("span");
    span.textContent = "I am a span";
    morph(shadow, span);

    // Should insert the span (tag mismatch = can't morph)
    const children = Array.from(shadow.childNodes);
    const hasSpan = children.some(
      (n) => n instanceof Element && n.tagName === "SPAN",
    );
    expect(hasSpan).toBe(true);
  });

  it("handles massive flat lists (4200 unkeyed elements)", () => {
    const shadow = createHost();
    const ul = document.createElement("ul");
    for (let i = 0; i < 4200; i++) {
      const li = document.createElement("li");
      li.textContent = `item-${i}`;
      ul.appendChild(li);
    }
    shadow.appendChild(ul);

    // Morph to a new list with 4200 different items
    const ul2 = document.createElement("ul");
    for (let i = 0; i < 4200; i++) {
      const li = document.createElement("li");
      li.textContent = `new-${i}`;
      ul2.appendChild(li);
    }

    morph(shadow, ul2);

    const morphedUl = shadow.firstChild as Element;
    expect(morphedUl.childNodes).toHaveLength(4200);
    expect((morphedUl.firstChild as Element).textContent).toBe("new-0");
    expect((morphedUl.lastChild as Element).textContent).toBe("new-4199");
  });
});
