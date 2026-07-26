/**
 * Tests: <loom-icon> fill support.
 *
 * The base stylesheet hardcoded `fill: none` on the svg, so a solid icon was
 * impossible regardless of what the caller passed. Fill and stroke-width are
 * now custom properties, with defaults that leave outline icons unchanged.
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomIcon } from "../src/element/icon";
import { fixture, cleanup } from "../src/testing";

afterEach(() => cleanup());

LoomIcon.register("square", '<rect x="4" y="4" width="16" height="16" />');

// @component queues registration for app.start(); define it directly here,
// the same way the other component tests do.
if (!customElements.get("loom-icon")) {
  customElements.define("loom-icon", LoomIcon as unknown as CustomElementConstructor);
}

describe("loom-icon fill", () => {
  it("defaults to no fill, preserving outline icons", async () => {
    const el = await fixture<LoomIcon>("loom-icon");
    el.name = "square";
    await el.updateComplete;
    expect(el.style.getPropertyValue("--_f")).toBe("none");
  });

  it("applies a fill colour", async () => {
    const el = await fixture<LoomIcon>("loom-icon");
    el.name = "square";
    el.fill = "currentColor";
    await el.updateComplete;
    expect(el.style.getPropertyValue("--_f")).toBe("currentColor");
  });

  it("applies stroke width", async () => {
    const el = await fixture<LoomIcon>("loom-icon");
    el.name = "square";
    el.strokeWidth = 0;
    await el.updateComplete;
    expect(el.style.getPropertyValue("--_sw")).toBe("0");
  });

  it("still applies size and colour", async () => {
    const el = await fixture<LoomIcon>("loom-icon");
    el.name = "square";
    el.size = 12;
    el.color = "red";
    await el.updateComplete;
    expect(el.style.getPropertyValue("--_s")).toBe("12px");
    expect(el.style.getPropertyValue("--_c")).toBe("red");
  });
});
