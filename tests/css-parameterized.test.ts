/**
 * Tests: css`` with interpolated values.
 *
 * The identity fast path keyed a WeakMap on the TemplateStringsArray. JS
 * memoizes that array per CALL SITE, independent of the interpolated values,
 * so a parameterized helper returned whatever sheet its first invocation
 * produced — forever:
 *
 *   const themed = (c: string) => css`:host { color: ${c} }`;
 *   themed("red"); themed("blue");   // both -> the red sheet
 *
 * The identity path is now used only for zero-interpolation templates; the
 * text-keyed cache handles the rest.
 */

import { describe, it, expect } from "vitest";
import { css } from "../src/css";

/** happy-dom exposes the source text via cssRules. */
function textOf(sheet: CSSStyleSheet): string {
  return Array.from(sheet.cssRules).map((r) => r.cssText).join("");
}

describe("css`` with interpolation", () => {
  it("returns different sheets for different interpolated values", () => {
    const themed = (c: string) => css`:host { color: ${c}; }`;

    const red = themed("red");
    const blue = themed("blue");

    expect(red).not.toBe(blue);
    expect(textOf(red)).toContain("red");
    expect(textOf(blue)).toContain("blue");
  });

  it("returns the same sheet for the same interpolated value", () => {
    const themed = (c: string) => css`:host { background: ${c}; }`;
    expect(themed("teal")).toBe(themed("teal"));
  });

  it("handles numeric interpolation", () => {
    const spaced = (n: number) => css`.pad { padding: ${n}px; }`;

    const a = spaced(4);
    const b = spaced(8);

    expect(a).not.toBe(b);
    expect(textOf(a)).toContain("4px");
    expect(textOf(b)).toContain("8px");
  });

  it("handles several interpolations in one template", () => {
    const box = (w: number, c: string) => css`.b { width: ${w}px; color: ${c}; }`;

    const one = box(10, "red");
    const two = box(10, "blue");
    const three = box(20, "red");

    expect(one).not.toBe(two);
    expect(one).not.toBe(three);
    expect(textOf(one)).toContain("10px");
    expect(textOf(three)).toContain("20px");
  });

  it("interleaved calls do not poison each other", () => {
    const themed = (c: string) => css`.x { border-color: ${c}; }`;

    const a1 = themed("aqua");
    const b1 = themed("brown");
    const a2 = themed("aqua");
    const b2 = themed("brown");

    expect(a1).toBe(a2);
    expect(b1).toBe(b2);
    expect(a1).not.toBe(b1);
  });
});

describe("css`` without interpolation (identity fast path)", () => {
  it("still dedupes a static template to one sheet", () => {
    const staticSheet = () => css`:host { display: grid; }`;
    expect(staticSheet()).toBe(staticSheet());
  });

  it("dedupes identical text across different call sites", () => {
    const a = css`:host { outline: none; }`;
    const b = css`:host { outline: none; }`;
    expect(a).toBe(b);
  });

  it("different static text yields different sheets", () => {
    const a = css`:host { z-index: 1; }`;
    const b = css`:host { z-index: 2; }`;
    expect(a).not.toBe(b);
  });
});
