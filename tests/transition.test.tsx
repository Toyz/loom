/**
 * Tests: @transition decorator — method wrapping & animation class logic (TC39 Stage 3)
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement, component } from "../src";
import { transition } from "../src/element/transition";
import { cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-trans-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@transition", () => {

  it("adds enterClass via queueMicrotask", async () => {
    const tag = nextTag();
    const div = document.createElement("div");

    class El extends LoomElement {
      @transition({ enterClass: "slide-in" })
      renderPanel() { return div; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as InstanceType<typeof El>;
    document.body.appendChild(el);
    el.renderPanel();
    await nextRender();

    expect(div.classList.contains("slide-in")).toBe(true);
  });

  it("applies enter animation style via queueMicrotask", async () => {
    const tag = nextTag();
    const div = document.createElement("div");

    class El extends LoomElement {
      @transition({ enter: "fade-in 300ms ease-out" })
      renderPanel() { return div; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as InstanceType<typeof El>;
    document.body.appendChild(el);
    el.renderPanel();
    await nextRender();

    expect(div.style.animation).toBe("fade-in 300ms ease-out");
  });

  it("passes through the result on enter", () => {
    const tag = nextTag();
    const div = document.createElement("div");
    div.className = "panel";
    div.textContent = "Content";

    class El extends LoomElement {
      @transition({ enterClass: "fade-in" })
      renderPanel() { return div; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as InstanceType<typeof El>;
    document.body.appendChild(el);
    const result = el.renderPanel();
    expect(result).toBe(div);
  });

  it("returns null on leave when original returns null", () => {
    const tag = nextTag();

    class El extends LoomElement {
      @transition({ leaveClass: "fade-out" })
      renderPanel() { return null; }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as InstanceType<typeof El>;
    document.body.appendChild(el);
    const result = el.renderPanel();
    expect(result).toBeNull();
  });
});
