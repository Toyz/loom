/**
 * Tests: @media — reactive media query binding
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement } from "../src/element";
import { media } from "../src/element/media";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-media-${++tagCounter}`; }

afterEach(() => cleanup());

// Mock matchMedia
function mockMatchMedia(initialMatch: boolean) {
  let handler: ((e: any) => void) | null = null;
  const mql = {
    matches: initialMatch,
    addEventListener: vi.fn((_type: string, cb: any) => { handler = cb; }),
    removeEventListener: vi.fn((_type: string, _cb: any) => { handler = null; }),
  };
  const trigger = (matches: boolean) => {
    mql.matches = matches;
    handler?.({ matches } as MediaQueryListEvent);
  };
  vi.stubGlobal("matchMedia", () => mql);
  return { mql, trigger };
}

describe("@media decorator", () => {
  it("sets initial value from matchMedia on connect", async () => {
    const tag = nextTag();
    const { mql } = mockMatchMedia(true);

    @component(tag)
    class TestEl extends LoomElement {
      @media("(max-width: 768px)")
      accessor isMobile = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(el.isMobile).toBe(true);
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    el.remove();
    vi.unstubAllGlobals();
  });

  it("updates when media query changes", async () => {
    const tag = nextTag();
    const { trigger } = mockMatchMedia(false);

    @component(tag)
    class TestEl extends LoomElement {
      @media("(max-width: 768px)")
      accessor isMobile = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    expect(el.isMobile).toBe(false);

    // Simulate media query match
    trigger(true);
    expect(el.isMobile).toBe(true);

    // Simulate unmatch
    trigger(false);
    expect(el.isMobile).toBe(false);

    el.remove();
    vi.unstubAllGlobals();
  });

  it("cleans up listener on disconnect", async () => {
    const tag = nextTag();
    const { mql } = mockMatchMedia(false);

    @component(tag)
    class TestEl extends LoomElement {
      @media("(max-width: 768px)")
      accessor isMobile = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.remove();

    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    vi.unstubAllGlobals();
  });

  it("allows programmatic override", async () => {
    const tag = nextTag();
    mockMatchMedia(false);

    @component(tag)
    class TestEl extends LoomElement {
      @media("(max-width: 768px)")
      accessor isMobile = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    expect(el.isMobile).toBe(false);

    el.isMobile = true;
    expect(el.isMobile).toBe(true);

    el.remove();
    vi.unstubAllGlobals();
  });
});
