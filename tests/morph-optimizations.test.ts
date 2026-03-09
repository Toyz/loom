/**
 * Tests: morph.ts optimizations — keepSet, snapshot buffer, event patching
 *
 * Edge cases for the performance changes:
 *   - keepSet (Set<Node>) vs old boolean hasKeep flag
 *   - Pooled _snapshotBuf handles varying child counts
 *   - Combined isKeep+getKey scan correctness
 *   - Inline hasNew tracking for event patching
 */
import { describe, it, expect, afterEach } from "vitest";
import { morph, loomEventProxy, type LoomNode } from "../src/morph";

afterEach(() => {
  document.body.innerHTML = "";
});

function createHost(): ShadowRoot {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host.attachShadow({ mode: "open" });
}

describe("morph keepSet optimization", () => {
  it("preserves multiple loom-keep elements", () => {
    const shadow = createHost();

    const keep1 = document.createElement("div");
    keep1.setAttribute("loom-keep", "");
    keep1.textContent = "keep-1";

    const keep2 = document.createElement("div");
    keep2.setAttribute("loom-keep", "");
    keep2.textContent = "keep-2";

    const normal = document.createElement("p");
    normal.textContent = "will be replaced";

    shadow.appendChild(keep1);
    shadow.appendChild(normal);
    shadow.appendChild(keep2);

    // Morph with completely new content
    const newContent = document.createElement("span");
    newContent.textContent = "new";
    morph(shadow, newContent);

    const nodes = Array.from(shadow.childNodes);
    const keptNodes = nodes.filter(
      (n) => n instanceof Element && n.hasAttribute("loom-keep"),
    );
    expect(keptNodes).toHaveLength(2);
    expect((keptNodes[0] as Element).textContent).toBe("keep-1");
    expect((keptNodes[1] as Element).textContent).toBe("keep-2");
  });

  it("handles mix of loom-keep and loom-key elements", () => {
    const shadow = createHost();

    const keyed = document.createElement("div");
    keyed.setAttribute("loom-key", "k1");
    keyed.textContent = "keyed";

    const kept = document.createElement("div");
    kept.setAttribute("loom-keep", "");
    kept.textContent = "kept";

    const normal = document.createElement("p");
    normal.textContent = "normal";

    shadow.appendChild(keyed);
    shadow.appendChild(kept);
    shadow.appendChild(normal);

    // Morph removes keyed, keeps kept, replaces normal
    const newContent = document.createElement("span");
    newContent.textContent = "replacement";
    morph(shadow, newContent);

    const nodes = Array.from(shadow.childNodes);
    const keptEl = nodes.find(
      (n) => n instanceof Element && n.hasAttribute("loom-keep"),
    );
    expect(keptEl).toBeTruthy();
    expect((keptEl as Element).textContent).toBe("kept");
  });

  it("loom-keep is not affected when no keep nodes exist", () => {
    const shadow = createHost();

    const a = document.createElement("div");
    a.textContent = "a";
    const b = document.createElement("div");
    b.textContent = "b";
    shadow.appendChild(a);
    shadow.appendChild(b);

    const c = document.createElement("span");
    c.textContent = "c";
    morph(shadow, c);

    // Old nodes should be replaced
    expect(shadow.childNodes).toHaveLength(1);
    expect(shadow.textContent).toBe("c");
  });

  it("loom-keep inside keyed removal still preserved", () => {
    const shadow = createHost();

    const keyed = document.createElement("div");
    keyed.setAttribute("loom-key", "willremove");
    keyed.textContent = "keyed-remove";

    const kept = document.createElement("div");
    kept.setAttribute("loom-keep", "");
    kept.setAttribute("loom-key", "also-keyed-and-kept");
    kept.textContent = "kept-and-keyed";

    shadow.appendChild(keyed);
    shadow.appendChild(kept);

    // Morph with no matching keys — keyed should be removed, kept should survive
    const newItem = document.createElement("p");
    newItem.textContent = "new";
    morph(shadow, newItem);

    const nodes = Array.from(shadow.childNodes);
    const keptEl = nodes.find(
      (n) => n instanceof Element && n.hasAttribute("loom-keep"),
    );
    expect(keptEl).toBeTruthy();
  });
});

describe("morph snapshot buffer", () => {
  it("correctly morphs deeply nested trees", () => {
    const shadow = createHost();

    // Build initial: div > ul > 3x li
    const div = document.createElement("div");
    const ul = document.createElement("ul");
    for (let i = 0; i < 3; i++) {
      const li = document.createElement("li");
      li.textContent = `old-${i}`;
      ul.appendChild(li);
    }
    div.appendChild(ul);
    shadow.appendChild(div);

    // Morph: div > ul > 5x li (different count)
    const div2 = document.createElement("div");
    const ul2 = document.createElement("ul");
    for (let i = 0; i < 5; i++) {
      const li = document.createElement("li");
      li.textContent = `new-${i}`;
      ul2.appendChild(li);
    }
    div2.appendChild(ul2);
    morph(shadow, div2);

    const morphedUl = (shadow.firstChild as Element).firstChild as Element;
    expect(morphedUl.childNodes).toHaveLength(5);
    expect((morphedUl.childNodes[0] as Element).textContent).toBe("new-0");
    expect((morphedUl.childNodes[4] as Element).textContent).toBe("new-4");
  });

  it("handles morph from many children to zero children", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    for (let i = 0; i < 10; i++) {
      const span = document.createElement("span");
      span.textContent = `item-${i}`;
      div.appendChild(span);
    }
    shadow.appendChild(div);

    // Morph to empty div
    const emptyDiv = document.createElement("div");
    morph(shadow, emptyDiv);

    expect((shadow.firstChild as Element).childNodes).toHaveLength(0);
  });

  it("handles morph from zero children to many children", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    shadow.appendChild(div);

    // Morph to div with many children
    const newDiv = document.createElement("div");
    for (let i = 0; i < 20; i++) {
      const p = document.createElement("p");
      p.textContent = `item-${i}`;
      newDiv.appendChild(p);
    }
    morph(shadow, newDiv);

    expect((shadow.firstChild as Element).childNodes).toHaveLength(20);
    expect((shadow.firstChild as Element).lastChild!.textContent).toBe("item-19");
  });

  it("handles consecutive morphs with varying child counts (buffer reuse)", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    shadow.appendChild(div);

    // Morph with 100 children
    const big = document.createElement("div");
    for (let i = 0; i < 100; i++) {
      const span = document.createElement("span");
      span.textContent = `big-${i}`;
      big.appendChild(span);
    }
    morph(shadow, big);
    expect((shadow.firstChild as Element).childNodes).toHaveLength(100);

    // Morph down to 3 children — buffer should handle the shrink
    const small = document.createElement("div");
    for (let i = 0; i < 3; i++) {
      const span = document.createElement("span");
      span.textContent = `small-${i}`;
      small.appendChild(span);
    }
    morph(shadow, small);
    expect((shadow.firstChild as Element).childNodes).toHaveLength(3);
    expect((shadow.firstChild as Element).firstChild!.textContent).toBe("small-0");

    // Morph back up to 50 — buffer grows again
    const medium = document.createElement("div");
    for (let i = 0; i < 50; i++) {
      const span = document.createElement("span");
      span.textContent = `med-${i}`;
      medium.appendChild(span);
    }
    morph(shadow, medium);
    expect((shadow.firstChild as Element).childNodes).toHaveLength(50);
  });
});

describe("morph event patching (inline hasNew)", () => {
  it("transfers events when new element has listeners", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    shadow.appendChild(div);

    const handler = () => {};
    const div2 = document.createElement("div");
    (div2 as unknown as LoomNode).__loomEvents = { click: handler };
    morph(shadow, div2);

    const el = shadow.firstChild as unknown as LoomNode;
    expect(el.__loomEvents).toBeDefined();
    expect(el.__loomEvents!["click"]).toBe(handler);
  });

  it("does not set __loomEvents when new element has no events", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    shadow.appendChild(div);

    const div2 = document.createElement("div");
    // No __loomEvents on div2
    morph(shadow, div2);

    const el = shadow.firstChild as unknown as LoomNode;
    // Should not have events set
    expect(el.__loomEvents).toBeUndefined();
  });

  it("removes old events and adds new ones atomically", () => {
    const shadow = createHost();
    const div = document.createElement("div");
    const oldHandler = () => {};
    (div as unknown as LoomNode).__loomEvents = { click: oldHandler, hover: oldHandler };
    div.addEventListener("click", loomEventProxy);
    div.addEventListener("hover" as any, loomEventProxy);
    shadow.appendChild(div);

    const newHandler = () => {};
    const div2 = document.createElement("div");
    (div2 as unknown as LoomNode).__loomEvents = { keydown: newHandler };
    morph(shadow, div2);

    const el = shadow.firstChild as unknown as LoomNode;
    expect(el.__loomEvents!["keydown"]).toBe(newHandler);
    expect(el.__loomEvents!["click"]).toBeUndefined();
    expect(el.__loomEvents!["hover"]).toBeUndefined();
  });
});

describe("morph keyed + keep combined scan", () => {
  it("handles empty parent (no children to scan)", () => {
    const shadow = createHost();
    // Empty shadow root

    const div = document.createElement("div");
    div.textContent = "first";
    morph(shadow, div);

    expect(shadow.childNodes).toHaveLength(1);
    expect(shadow.textContent).toBe("first");
  });

  it("handles all children being keyed", () => {
    const shadow = createHost();

    for (let i = 0; i < 5; i++) {
      const el = document.createElement("div");
      el.setAttribute("loom-key", `k${i}`);
      el.textContent = `old-${i}`;
      shadow.appendChild(el);
    }

    // Reorder and update
    const newChildren: Node[] = [];
    for (let i = 4; i >= 0; i--) {
      const el = document.createElement("div");
      el.setAttribute("loom-key", `k${i}`);
      el.textContent = `new-${i}`;
      newChildren.push(el);
    }
    morph(shadow, newChildren);

    expect(shadow.childNodes).toHaveLength(5);
    // Should be reversed order
    expect((shadow.childNodes[0] as Element).getAttribute("loom-key")).toBe("k4");
    expect((shadow.childNodes[4] as Element).getAttribute("loom-key")).toBe("k0");
    // Content should be updated
    expect((shadow.childNodes[0] as Element).textContent).toBe("new-4");
  });

  it("handles all children being kept", () => {
    const shadow = createHost();

    for (let i = 0; i < 3; i++) {
      const el = document.createElement("div");
      el.setAttribute("loom-keep", "");
      el.textContent = `kept-${i}`;
      shadow.appendChild(el);
    }

    // Morph with different content
    const newEl = document.createElement("span");
    newEl.textContent = "new-stuff";
    morph(shadow, newEl);

    // All keeps should survive
    const nodes = Array.from(shadow.childNodes);
    const keeps = nodes.filter(
      (n) => n instanceof Element && n.hasAttribute("loom-keep"),
    );
    expect(keeps).toHaveLength(3);
  });
});
