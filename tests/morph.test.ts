/**
 * Tests: DOM morphing — morph(), key preservation, loom-keep
 */
import { describe, it, expect, beforeEach } from "vitest";
import { morph } from "../src/morph";

beforeEach(() => {
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
    a.setAttribute("data-loom-key", "a");
    a.textContent = "A";
    const b = document.createElement("div");
    b.setAttribute("data-loom-key", "b");
    b.textContent = "B";
    shadow.appendChild(a);
    shadow.appendChild(b);

    // Re-render with reversed order
    const a2 = document.createElement("div");
    a2.setAttribute("data-loom-key", "a");
    a2.textContent = "A-updated";
    const b2 = document.createElement("div");
    b2.setAttribute("data-loom-key", "b");
    b2.textContent = "B-updated";

    morph(shadow, [b2, a2]);

    // Keys should cause reuse of original DOM nodes
    expect(shadow.childNodes).toHaveLength(2);
    expect((shadow.childNodes[0] as Element).getAttribute("data-loom-key")).toBe("b");
    expect((shadow.childNodes[1] as Element).getAttribute("data-loom-key")).toBe("a");
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
});
