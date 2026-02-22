/**
 * Tests: JSX runtime — jsx(), Fragment, event handlers, SVG, rawHTML, value prop
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { jsx, jsxs, Fragment } from "../src/jsx-runtime";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("jsx()", () => {
  it("creates an HTML element with tag name", () => {
    const el = jsx("div", {});
    expect(el.tagName).toBe("DIV");
  });

  it("sets attributes", () => {
    const el = jsx("div", { id: "test", "data-value": "42" });
    expect(el.getAttribute("id")).toBe("test");
    expect(el.getAttribute("data-value")).toBe("42");
  });

  it("maps class prop to className", () => {
    const el = jsx("div", { class: "my-class" });
    expect(el.getAttribute("class")).toBe("my-class");
  });

  it("sets style string", () => {
    const el = jsx("div", { style: "color: red" });
    expect(el.getAttribute("style")).toBe("color: red");
  });

  it("sets style object", () => {
    const el = jsx("div", { style: { color: "red", fontSize: "14px" } }) as HTMLElement;
    expect(el.style.color).toBe("red");
    expect(el.style.fontSize).toBe("14px");
  });

  it("attaches event handlers (onClick → click)", () => {
    const fn = vi.fn();
    const el = jsx("button", { onClick: fn });
    el.dispatchEvent(new Event("click"));
    expect(fn).toHaveBeenCalledOnce();
  });

  it("renders text children", () => {
    const el = jsx("span", { children: "hello" });
    expect(el.textContent).toBe("hello");
  });

  it("renders nested element children", () => {
    const child = jsx("span", { children: "inner" });
    const parent = jsx("div", { children: child });
    expect(parent.children.length).toBe(1);
    expect(parent.textContent).toBe("inner");
  });

  it("renders array children", () => {
    const children = [
      jsx("li", { children: "a" }),
      jsx("li", { children: "b" }),
      jsx("li", { children: "c" }),
    ];
    const ul = jsx("ul", { children });
    expect(ul.children.length).toBe(3);
  });

  it("skips null/undefined/false children", () => {
    const el = jsx("div", { children: [null, undefined, false, "visible"] });
    expect(el.textContent).toBe("visible");
  });

  it("renders true as text (Loom behavior)", () => {
    const el = jsx("div", { children: [true, "text"] });
    expect(el.textContent).toBe("truetext");
  });

  it("sets value as property (not attribute) on input", () => {
    const el = jsx("input", { value: "test" }) as HTMLInputElement;
    expect(el.value).toBe("test");
  });

  it("sets innerHTML via rawHTML prop", () => {
    const el = jsx("div", { rawHTML: "<b>bold</b>" });
    expect(el.innerHTML).toBe("<b>bold</b>");
  });
});

describe("jsxs", () => {
  it("is the same as jsx", () => {
    expect(jsxs).toBe(jsx);
  });
});

describe("Fragment", () => {
  it("returns a DocumentFragment", () => {
    const frag = Fragment({ children: [jsx("span", { children: "a" }), jsx("span", { children: "b" })] });
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.childNodes.length).toBe(2);
  });

  it("handles single child", () => {
    const frag = Fragment({ children: jsx("div", { children: "only" }) });
    expect(frag.childNodes.length).toBe(1);
  });

  it("handles no children", () => {
    const frag = Fragment({});
    expect(frag.childNodes.length).toBe(0);
  });
});

describe("SVG support", () => {
  it("creates SVG elements in SVG namespace", () => {
    const svg = jsx("svg", { viewBox: "0 0 24 24", children: jsx("path", { d: "M0 0" }) });
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.children[0].tagName).toBe("path");
  });
});

describe("Function components", () => {
  it("calls function with props and returns its result", () => {
    function MyComponent(props: { name: string }) {
      return jsx("div", { children: `Hello ${props.name}` });
    }
    const el = jsx(MyComponent, { name: "World" });
    expect(el.textContent).toBe("Hello World");
  });
});

describe("ref callback", () => {
  it("calls ref with the created element", () => {
    const fn = vi.fn();
    const el = jsx("div", { ref: fn });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(el);
  });

  it("ref receives the correct element type", () => {
    let captured: HTMLInputElement | null = null;
    const el = jsx("input", { ref: (e: any) => { captured = e; } });
    expect(captured).toBe(el);
    expect(captured!.tagName).toBe("INPUT");
  });
});

describe("htmlFor → for attribute", () => {
  it("maps htmlFor prop to for attribute on label", () => {
    const el = jsx("label", { htmlFor: "email-field" });
    expect(el.getAttribute("for")).toBe("email-field");
    expect(el.hasAttribute("htmlFor")).toBe(false);
  });
});

describe("boolean attribute handling", () => {
  it("sets boolean true as empty attribute", () => {
    const el = jsx("input", { disabled: true }) as HTMLInputElement;
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.getAttribute("disabled")).toBe("");
  });

  it("removes attribute for boolean false", () => {
    const el = jsx("div", { hidden: false }) as HTMLElement;
    expect(el.hasAttribute("hidden")).toBe(false);
  });

  it("sets aria boolean attributes correctly", () => {
    const el = jsx("div", { "aria-expanded": true });
    expect(el.hasAttribute("aria-expanded")).toBe(true);
  });
});

describe("DOM property props (PROP_KEYS)", () => {
  it("sets checked as a DOM property", () => {
    const el = jsx("input", { type: "checkbox", checked: true }) as HTMLInputElement;
    expect(el.checked).toBe(true);
  });

  it("sets selected as a DOM property", () => {
    const el = jsx("option", { selected: true }) as HTMLOptionElement;
    expect(el.selected).toBe(true);
  });
});

describe("non-primitive props (LOOM_PROPS)", () => {
  it("stores object props as JS properties and tracks in __loomProps", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const el = jsx("div", { items }) as any;
    expect(el.items).toEqual(items);
    expect(el.__loomProps).toBeDefined();
    expect(el.__loomProps["items"]).toEqual(items);
  });
});

describe("rawHTML marker", () => {
  it("sets __loomRawHTML flag on element with rawHTML", () => {
    const el = jsx("div", { rawHTML: "<b>bold</b>" }) as any;
    expect(el.__loomRawHTML).toBe(true);
    expect(el.innerHTML).toBe("<b>bold</b>");
  });

  it("sets __loomRawHTML flag on element with innerHTML prop", () => {
    const el = jsx("div", { innerHTML: "<em>italic</em>" }) as any;
    expect(el.__loomRawHTML).toBe(true);
    expect(el.innerHTML).toBe("<em>italic</em>");
  });
});

describe("closure text binding", () => {
  it("creates a text node from a function child", () => {
    let count = 42;
    const el = jsx("span", { children: () => count });
    expect(el.textContent).toBe("42");
  });
});
