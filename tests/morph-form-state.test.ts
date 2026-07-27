/**
 * Tests: morph only patches DOM properties the template declared.
 *
 * patchProperties() copied value/checked/selected/indeterminate whenever
 * `key in next` — which is true for every <input>/<option> regardless of what
 * JSX set. So any full re-render reset the live element to the freshly-created
 * one's defaults and destroyed whatever the user had typed or ticked.
 *
 * jsx() now records those keys in __loomProps only when the template actually
 * declared them, and patchJSProps is the single patching path.
 */

import { describe, it, expect } from "vitest";
import { morph } from "../src/morph";
import { jsx } from "../src/jsx-runtime";

function host(): ShadowRoot {
  return document.createElement("div").attachShadow({ mode: "open" });
}

describe("uncontrolled form state survives morph", () => {
  it("keeps a typed value when the template declares no value", () => {
    const root = host();
    const build = (label: string) =>
      jsx("div", { children: [jsx("input", {}), jsx("span", { children: label })] }) as HTMLElement;

    morph(root, build("0"));
    root.querySelector("input")!.value = "hello";
    morph(root, build("1"));

    expect(root.querySelector("span")!.textContent).toBe("1");
    expect(root.querySelector("input")!.value).toBe("hello");
  });

  it("keeps a ticked checkbox the template never declared", () => {
    const root = host();
    const build = (label: string) =>
      jsx("div", {
        children: [jsx("input", { type: "checkbox" }), jsx("span", { children: label })],
      }) as HTMLElement;

    morph(root, build("a"));
    root.querySelector("input")!.checked = true;
    morph(root, build("b"));

    expect(root.querySelector("span")!.textContent).toBe("b");
    expect(root.querySelector("input")!.checked).toBe(true);
  });

  it("keeps a selected option the template never declared", () => {
    const root = host();
    const build = (label: string) =>
      jsx("div", {
        children: [
          jsx("select", { children: [jsx("option", { children: "x" }), jsx("option", { children: "y" })] }),
          jsx("span", { children: label }),
        ],
      }) as HTMLElement;

    morph(root, build("a"));
    const opts = root.querySelectorAll("option");
    opts[1].selected = true;
    morph(root, build("b"));

    expect(root.querySelectorAll("option")[1].selected).toBe(true);
  });

  it("keeps an indeterminate checkbox", () => {
    const root = host();
    const build = (label: string) =>
      jsx("div", {
        children: [jsx("input", { type: "checkbox" }), jsx("span", { children: label })],
      }) as HTMLElement;

    morph(root, build("a"));
    root.querySelector("input")!.indeterminate = true;
    morph(root, build("b"));

    expect(root.querySelector("input")!.indeterminate).toBe(true);
  });
});

describe("controlled form state still patches", () => {
  it("patches value when the template declares it", () => {
    const root = host();
    morph(root, jsx("input", { value: "first" }) as HTMLElement);
    expect(root.querySelector("input")!.value).toBe("first");

    morph(root, jsx("input", { value: "second" }) as HTMLElement);
    expect(root.querySelector("input")!.value).toBe("second");
  });

  it("patches checked when the template declares it", () => {
    const root = host();
    morph(root, jsx("input", { type: "checkbox", checked: false }) as HTMLElement);
    expect(root.querySelector("input")!.checked).toBe(false);

    morph(root, jsx("input", { type: "checkbox", checked: true }) as HTMLElement);
    expect(root.querySelector("input")!.checked).toBe(true);
  });

  it("a declared value overrides what the user typed", () => {
    const root = host();
    morph(root, jsx("input", { value: "a" }) as HTMLElement);
    root.querySelector("input")!.value = "user";
    morph(root, jsx("input", { value: "b" }) as HTMLElement);

    expect(root.querySelector("input")!.value).toBe("b");
  });
});

describe("JS prop removal restores the prior value", () => {
  it("restores the value the element had before Loom wrote the prop", () => {
    const root = host();

    const first = document.createElement("my-list");
    (first as any).items = ["a"];
    (first as any).__loomProps = { items: ["a"] };
    morph(root, first);

    const live = root.firstElementChild as any;
    expect(live.items).toEqual(["a"]);

    // Re-render without the prop — the child must stop seeing stale data.
    const second = document.createElement("my-list");
    morph(root, second);

    expect(live.items).toBeUndefined();
  });

  it("clears the bookkeeping entry as well", () => {
    const root = host();

    const first = document.createElement("div");
    (first as any).items = [1];
    (first as any).__loomProps = { items: [1] };
    morph(root, first);

    morph(root, document.createElement("div"));

    const live = root.firstElementChild as any;
    expect(live.__loomProps.items).toBeUndefined();
  });

  it("re-adding the prop after removal works", () => {
    const root = host();

    const mk = (items?: unknown[]) => {
      const el = document.createElement("div");
      if (items) {
        (el as any).items = items;
        (el as any).__loomProps = { items };
      }
      return el;
    };

    morph(root, mk([1]));
    morph(root, mk());
    morph(root, mk([2]));

    expect((root.firstElementChild as any).items).toEqual([2]);
  });
});

describe("reconciliation only removes what the template declared", () => {
  /**
   * These build `next` through the JSX runtime rather than createElement,
   * because that is what records the declaration. A hand-built element has no
   * template behind it, which is exactly the distinction under test.
   */
  const tpl = (tag: string, attrs: Record<string, string> = {}) =>
    jsx(tag, Object.keys(attrs).length ? { ...attrs } : {}) as HTMLElement;

  it("keeps a dialog's open attribute", () => {
    // showModal() sets `open`; no template declares it. Removing it is the
    // documented way to strand a modal -- the dialog disappears, the page
    // stays inert behind it, and no `close` event fires.
    const root = document.createElement("div");
    const live = tpl("dialog", { id: "d" });
    live.setAttribute("open", "");        // the browser, after showModal()
    root.appendChild(live);

    morph(root, [tpl("dialog", { id: "d" })]);

    expect(root.querySelector("dialog")!.hasAttribute("open")).toBe(true);
  });

  it("keeps a details open by the user", () => {
    // The other half of the same bug, and the one I argued past: clicking a
    // <summary> sets `open` on the element, so an unrelated re-render used to
    // snap the disclosure shut under the reader.
    const root = document.createElement("div");
    const live = tpl("details", { id: "x" });
    live.setAttribute("open", "");        // the user, by clicking
    root.appendChild(live);

    morph(root, [tpl("details", { id: "x" })]);

    expect(root.querySelector("details")!.hasAttribute("open")).toBe(true);
  });

  it("still removes an attribute the template dropped", () => {
    const root = document.createElement("div");
    root.appendChild(tpl("div", { id: "a", title: "gone" }));

    morph(root, [tpl("div", { id: "a" })]);

    const el = root.querySelector("div")!;
    expect(el.getAttribute("id")).toBe("a");
    expect(el.hasAttribute("title")).toBe(false);
  });

  it("still removes when the template drops every attribute", () => {
    const root = document.createElement("div");
    const live = tpl("div", { id: "a", title: "t" });
    live.setAttribute("data-browser", "1");   // not from a template
    root.appendChild(live);

    morph(root, [tpl("div")]);

    const el = root.querySelector("div")!;
    expect(el.hasAttribute("id")).toBe(false);
    expect(el.hasAttribute("title")).toBe(false);
    expect(el.getAttribute("data-browser")).toBe("1");  // never ours to remove
  });

  it("lets a template still control open when it declares it", () => {
    // Declared once, dropped next render -> removable, because the template
    // is the one that put it there.
    const root = document.createElement("div");
    root.appendChild(tpl("details", { open: "" }));

    morph(root, [tpl("details")]);

    expect(root.querySelector("details")!.hasAttribute("open")).toBe(false);
  });
});
