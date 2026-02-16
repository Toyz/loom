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
