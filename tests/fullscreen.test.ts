/**
 * Tests: @fullscreen — Fullscreen API binding
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement } from "../src/element";
import { fullscreen } from "../src/element/fullscreen";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-fs-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@fullscreen decorator", () => {
  it("starts with false", async () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @fullscreen()
      accessor isFullscreen = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(el.isFullscreen).toBe(false);
    el.remove();
  });

  it("calls requestFullscreen when set to true", async () => {
    const tag = nextTag();
    const rfs = vi.fn();

    @component(tag)
    class TestEl extends LoomElement {
      @fullscreen()
      accessor isFullscreen = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    el.requestFullscreen = rfs;
    document.body.appendChild(el);

    el.isFullscreen = true;
    expect(rfs).toHaveBeenCalled();

    el.remove();
  });

  it("calls exitFullscreen when set to false", async () => {
    const tag = nextTag();
    const efs = vi.fn();

    @component(tag)
    class TestEl extends LoomElement {
      @fullscreen()
      accessor isFullscreen = false;
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    el.requestFullscreen = vi.fn();
    document.body.appendChild(el);

    // Set to fullscreen
    el.isFullscreen = true;

    // Mock document state
    Object.defineProperty(document, "fullscreenElement", { value: el, configurable: true });
    document.exitFullscreen = efs;

    el.isFullscreen = false;
    expect(efs).toHaveBeenCalled();

    // Cleanup
    Object.defineProperty(document, "fullscreenElement", { value: null, configurable: true });
    el.remove();
  });
});
