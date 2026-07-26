/**
 * Tests: closure bindings on attribute props — `title={() => this.label}`.
 *
 * These never worked. jsx()'s prop loop reached
 *   `else if (typeof val === "object" || typeof val === "function")`
 * before the closure branch below it, so every function value was swallowed
 * and assigned as a JS property: `href={() => this.url}` set the anchor's href
 * to the literal source text "() => this.url". That silently broke the entire
 * MaybeReactive<T> half of the JSX type surface — title, href, hidden, role,
 * disabled, src, placeholder, aria-*, style.
 */

import { describe, it, expect, vi } from "vitest";
import { jsx } from "../src/jsx-runtime";
import { Reactive } from "../src/store/reactive";
import {
  startTrace, endTrace, applyBindings, refreshSnapshots, isTracing,
} from "../src/trace";

/** Render inside a trace, returning the element and its trace. */
function rendered(build: () => HTMLElement | SVGElement) {
  startTrace();
  const el = build();
  const trace = endTrace();
  return { el, trace };
}

function flush(trace: ReturnType<typeof endTrace>) {
  applyBindings(trace);
  refreshSnapshots(trace);
}

describe("closure bindings — initial application", () => {
  it("title renders the value, not the function source", () => {
    const label = new Reactive("Save");
    const el = jsx("button", { title: () => label.peek() }) as HTMLElement;
    expect(el.getAttribute("title")).toBe("Save");
  });

  it("href renders the value", () => {
    const url = new Reactive("/docs");
    const el = jsx("a", { href: () => url.peek() }) as HTMLElement;
    expect(el.getAttribute("href")).toBe("/docs");
  });

  it("hidden=false removes the attribute; hidden=true sets it", () => {
    const on = jsx("div", { hidden: () => true }) as HTMLElement;
    const off = jsx("div", { hidden: () => false }) as HTMLElement;
    expect(on.hasAttribute("hidden")).toBe(true);
    expect(off.hasAttribute("hidden")).toBe(false);
  });

  it("aria-* renders the value", () => {
    const el = jsx("div", { "aria-label": () => "Close dialog" }) as HTMLElement;
    expect(el.getAttribute("aria-label")).toBe("Close dialog");
  });

  it("data-* renders the value", () => {
    const el = jsx("div", { "data-state": () => "open" }) as HTMLElement;
    expect(el.getAttribute("data-state")).toBe("open");
  });

  it("class closure sets className on HTML", () => {
    const el = jsx("div", { class: () => "a b" }) as HTMLElement;
    expect(el.className).toBe("a b");
  });

  it("class closure sets the class attribute on SVG", () => {
    const el = jsx("circle", { class: () => "dot" }) as SVGElement;
    expect(el.getAttribute("class")).toBe("dot");
  });

  it("style closure accepts an object", () => {
    const el = jsx("div", { style: () => ({ color: "red" }) }) as HTMLElement;
    expect(el.style.color).toBe("red");
  });

  it("style closure accepts a string", () => {
    const el = jsx("div", { style: () => "color: blue" }) as HTMLElement;
    expect(el.getAttribute("style")).toContain("blue");
  });

  it("value closure sets the JS property on an input", () => {
    const el = jsx("input", { value: () => "typed" }) as HTMLInputElement;
    expect(el.value).toBe("typed");
  });

  it("a null result removes the attribute", () => {
    const el = jsx("div", { title: () => null }) as HTMLElement;
    expect(el.hasAttribute("title")).toBe(false);
  });
});

describe("closure bindings — reactive updates", () => {
  it("fast-patches an attribute when its reactive changes", () => {
    const label = new Reactive("Save");
    const { el, trace } = rendered(() => jsx("button", { title: () => label.value }) as HTMLElement);

    expect((el as HTMLElement).getAttribute("title")).toBe("Save");
    label.set("Submit");
    flush(trace);
    expect((el as HTMLElement).getAttribute("title")).toBe("Submit");
  });

  it("fast-patches className", () => {
    const active = new Reactive(false);
    const { el, trace } = rendered(
      () => jsx("div", { class: () => (active.value ? "on" : "off") }) as HTMLElement,
    );

    expect((el as HTMLElement).className).toBe("off");
    active.set(true);
    flush(trace);
    expect((el as HTMLElement).className).toBe("on");
  });

  it("fast-patches a boolean attribute on and off", () => {
    const hidden = new Reactive(false);
    const { el, trace } = rendered(() => jsx("div", { hidden: () => hidden.value }) as HTMLElement);

    expect((el as HTMLElement).hasAttribute("hidden")).toBe(false);
    hidden.set(true);
    flush(trace);
    expect((el as HTMLElement).hasAttribute("hidden")).toBe(true);
    hidden.set(false);
    flush(trace);
    expect((el as HTMLElement).hasAttribute("hidden")).toBe(false);
  });

  it("registers the binding against the reactive it read", () => {
    const r = new Reactive("x");
    const { trace } = rendered(() => jsx("div", { title: () => r.value }) as HTMLElement);
    expect(trace.bindings.has(r)).toBe(true);
  });

  it("creates no binding for a closure that reads nothing", () => {
    const { trace } = rendered(() => jsx("div", { title: () => "static" }) as HTMLElement);
    expect(trace.bindings.size).toBe(0);
  });
});

describe("closure bindings — what must NOT become a binding", () => {
  it("an arity-1 function stays a JS property (template function)", () => {
    const renderItem = (x: unknown) => x;
    const el = jsx("my-list", { renderItem }) as HTMLElement;
    expect((el as any).renderItem).toBe(renderItem);
    expect(el.hasAttribute("renderitem")).toBe(false);
  });

  it("an arity-0 callback on a custom element stays a JS property", () => {
    const reload = () => "called";
    const el = jsx("my-widget", { reload }) as HTMLElement;
    expect((el as any).reload).toBe(reload);
  });

  it("event handlers are still wired as listeners", () => {
    const onClick = vi.fn();
    const el = jsx("button", { onClick }) as HTMLElement;
    el.dispatchEvent(new Event("click"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ref is still invoked with the element", () => {
    const ref = vi.fn();
    const el = jsx("div", { ref }) as HTMLElement;
    expect(ref).toHaveBeenCalledWith(el);
  });

  it("objects and arrays are still JS properties", () => {
    const items = [1, 2, 3];
    const el = jsx("my-list", { items }) as HTMLElement;
    expect((el as any).items).toBe(items);
  });
});

describe("closure bindings — error handling", () => {
  it("logs and leaves the trace stack balanced when a closure throws", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      startTrace();
      jsx("div", { title: () => { throw new Error("closure boom"); } });
      endTrace();
      expect(err).toHaveBeenCalled();
      expect(isTracing()).toBe(false);
    } finally {
      err.mockRestore();
    }
  });
});
