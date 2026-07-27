/**
 * Design tokens.
 *
 * The problem these exist for is measurable: this repo's own docs carried 479
 * hand-written `var(--token, fallback)` pairs, and the fallbacks had drifted --
 * `--text-muted` with five different values, `--accent` with two unrelated
 * purples. A fallback only renders when the token is undefined, so the drift
 * was invisible until it wasn't, and what it produced was a second palette.
 */
import { describe, it, expect } from "vitest";
import { tokens } from "../src/tokens";
import { css, cssText, isLazySheet, toSheet, __cacheSize as cacheSize } from "../src/css";

describe("tokens()", () => {
  it("builds a var() reference with the value as its fallback", () => {
    const t = tokens({ ground: "#14140f" });
    expect(t.ground).toBe("var(--ground, #14140f)");
  });

  it("converts camelCase to a kebab custom property", () => {
    const t = tokens({ textMuted: "#6d6858", spaceLg: "2rem" });
    expect(t.textMuted).toBe("var(--text-muted, #6d6858)");
    expect(t.spaceLg).toBe("var(--space-lg, 2rem)");
    expect(t.$name("textMuted")).toBe("--text-muted");
  });

  it("treats a digit as a new part, the way scales are written", () => {
    // --space-1, --text-2xl. Getting this wrong points the token at a property
    // nobody declared, and the fallback then covers for it silently.
    const t = tokens({ space1: "0.25rem", text2xl: "1.875rem", surface2: "#1c1c15" });
    expect(t.space1).toBe("var(--space-1, 0.25rem)");
    expect(t.text2xl).toBe("var(--text-2xl, 1.875rem)");
    expect(t.surface2).toBe("var(--surface-2, #1c1c15)");
  });

  it("takes numbers", () => {
    const t = tokens({ zIndexTop: 9999 });
    expect(t.zIndexTop).toBe("var(--z-index-top, 9999)");
  });

  it("declares the properties from the same literals as the fallbacks", () => {
    // The point: the declaration and the fallback cannot disagree, because
    // they are generated from one value.
    const t = tokens({ ground: "#14140f", textMuted: "#6d6858" });
    const text = cssText(t.$sheet);
    expect(text).toContain(":host");
    expect(text).toContain("--ground: #14140f;");
    expect(text).toContain("--text-muted: #6d6858;");
  });

  it("can declare onto any selector", () => {
    const t = tokens({ ground: "#14140f" });
    expect(cssText(t.$sheetFor(":root"))).toContain(":root");
  });

  it("exposes raw values for the places var() cannot go", () => {
    // A canvas 2D context cannot take var(); reaching for the hex by hand is
    // what reintroduced the drift in the first place.
    const t = tokens({ thread: "#c4472f" });
    expect(t.$value.thread).toBe("#c4472f");
  });

  it("rejects a $-prefixed name rather than shadowing the helpers", () => {
    expect(() => tokens({ $sheet: "x" } as any)).toThrow(/cannot start with/);
  });

  it("interpolates into css`` as an ordinary string", () => {
    const t = tokens({ ground: "#14140f" });
    const sheet = css`:host { background: ${t.ground}; }`;
    expect(cssText(sheet)).toContain("background: var(--ground, #14140f);");
  });
});

describe("css`` composition", () => {
  it("inlines an interpolated sheet", () => {
    const base = css`.btn { border: 0; }`;
    const sheet = css`${base} .btn:hover { opacity: 0.8; }`;
    const text = cssText(sheet);
    expect(text).toContain(".btn { border: 0; }");
    expect(text).toContain(".btn:hover");
  });

  it("dedupes composed sheets by resulting text", () => {
    const base = css`.a { color: red; }`;
    const one = css`${base} .b { color: blue; }`;
    const two = css`${base} .b { color: blue; }`;
    expect(one).toBe(two);
  });

  it("does not confuse a parameterized helper for a static one", () => {
    // The TemplateStringsArray identity cache is only sound with no
    // interpolation; a themed helper must not return the first call's sheet.
    const themed = (c: string) => css`:host { color: ${c}; }`;
    expect(themed("red")).not.toBe(themed("blue"));
  });

  it("returns the same sheet for identical static css", () => {
    const a = css`.x { color: red; }`;
    const b = css`.x { color: red; }`;
    expect(a).toBe(b);
  });
});

describe("css.lazy", () => {
  it("does not build a sheet until it is used", () => {
    // The point: `new CSSStyleSheet()` does not exist in Node, so a module
    // holding `const styles = css`...`` at the top level throws on *import*.
    // Since that is how every component declares styles, the whole module
    // graph becomes browser-only.
    let constructed = 0;
    const Real = globalThis.CSSStyleSheet;
    (globalThis as any).CSSStyleSheet = class extends Real {
      constructor() { super(); constructed++; }
    };

    // Text nothing else in the suite uses: a lazy sheet reuses a cached one
    // when the text matches, which would mean nothing is constructed here.
    const handle = css.lazy`.lazy-probe-unique { color: rebeccapurple; }`;
    expect(constructed).toBe(0);
    expect(handle.text).toContain("lazy-probe-unique");

    void handle.sheet;
    expect(constructed).toBe(1);

    void handle.sheet;
    expect(constructed).toBe(1); // built once, then cached

    (globalThis as any).CSSStyleSheet = Real;
  });

  it("shares one sheet with the eager form for identical text", () => {
    const eager = css`.shared { color: blue; }`;
    const lazyOne = css.lazy`.shared { color: blue; }`;
    expect(lazyOne.sheet).toBe(eager);
  });

  it("returns the same handle for a static template", () => {
    const make = () => css.lazy`.static { color: green; }`;
    expect(make()).toBe(make());
  });

  it("does not reuse a handle across different interpolated values", () => {
    const themed = (c: string) => css.lazy`.t { color: ${c}; }`;
    expect(themed("red").text).not.toBe(themed("blue").text);
  });

  it("is recognisable, and resolves through toSheet", () => {
    const lazyOne = css.lazy`.z { color: red; }`;
    const eager = css`.z2 { color: red; }`;
    expect(isLazySheet(lazyOne)).toBe(true);
    expect(isLazySheet(eager)).toBe(false);
    expect(toSheet(lazyOne)).toBe(lazyOne.sheet);
    expect(toSheet(eager)).toBe(eager);
  });
});

describe("stylesheet cache", () => {
  it("does not grow without bound for interpolated css", () => {
    // A themed helper mints a new entry per distinct value. Uncapped, a page
    // retains every sheet it ever produced.
    const before = cacheSize();
    for (let i = 0; i < 700; i++) css`.gen { --i: ${i}; }`;
    const after = cacheSize();
    expect(after).toBeLessThanOrEqual(512);
    expect(after).toBeGreaterThan(0);
    void before;
  });

  it("keeps returning the same sheet for one call site, whatever is evicted", () => {
    // The identity cache is keyed on the TemplateStringsArray, which is the
    // same frozen object every time that line runs -- so a component's own
    // styles are stable regardless of churn elsewhere.
    const make = () => css`.stable { color: teal; }`;
    const a = make();
    for (let i = 0; i < 700; i++) css`.churn { --i: ${i}; }`;
    expect(make()).toBe(a);
  });

  it("only dedupes across separate call sites while the text is still cached", () => {
    // The honest limit of a bounded cache: two different call sites with
    // identical text share a sheet, until eviction separates them. That costs
    // a duplicate sheet, never correctness.
    const a = css`.twin { color: olive; }`;
    const b = css`.twin { color: olive; }`;
    expect(b).toBe(a);
  });
});
