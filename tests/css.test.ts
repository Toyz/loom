/**
 * Tests: css`` tagged template + adoptCSS
 */
import { describe, it, expect, beforeEach } from "vitest";
import { css, adoptCSS } from "../src/css";

describe("css()", () => {
  it("returns a CSSStyleSheet", () => {
    const sheet = css`:host { display: block }`;
    expect(sheet).toBeInstanceOf(CSSStyleSheet);
  });

  it("interpolates values", () => {
    const size = 8;
    const color = "#ff6b6b";
    const sheet = css`button { padding: ${size}px; background: ${color}; }`;
    expect(sheet).toBeInstanceOf(CSSStyleSheet);
  });

  it("caches identical CSS strings", () => {
    const a = css`:host { color: red }`;
    const b = css`:host { color: red }`;
    expect(a).toBe(b); // same CSSStyleSheet instance
  });

  it("returns different sheets for different CSS", () => {
    const a = css`:host { color: red }`;
    const b = css`:host { color: blue }`;
    expect(a).not.toBe(b);
  });
});

describe("adoptCSS()", () => {
  function createShadow(): ShadowRoot {
    const host = document.createElement("div");
    document.body.appendChild(host);
    return host.attachShadow({ mode: "open" });
  }

  it("adopts a stylesheet from a string", () => {
    const shadow = createShadow();
    adoptCSS(shadow, ":host { display: flex }");
    expect(shadow.adoptedStyleSheets.length).toBe(1);
  });

  it("deduplicates identical stylesheets", () => {
    const shadow = createShadow();
    adoptCSS(shadow, ":host { color: red }");
    adoptCSS(shadow, ":host { color: red }");
    expect(shadow.adoptedStyleSheets.length).toBe(1);
  });

  it("allows different stylesheets", () => {
    const shadow = createShadow();
    adoptCSS(shadow, ":host { color: red }");
    adoptCSS(shadow, ":host { color: blue }");
    expect(shadow.adoptedStyleSheets.length).toBe(2);
  });
});
