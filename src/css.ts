/**
 * Loom — CSS tagged template + cache
 *
 * Standalone css`` tag for creating reusable, cached CSSStyleSheets.
 * Same CSS string → same CSSStyleSheet instance (deduped across components).
 */

/** Allowed types for css`` interpolation */
export type CSSValue = string | number;

/** Global cache — same CSS string → same CSSStyleSheet instance */
const cssCache = new Map<string, CSSStyleSheet>();

/**
 * V8 trick: TemplateStringsArray is always the same frozen object for the
 * same source-level template literal. Use it as a fast identity key to skip
 * String.raw() entirely on cache hits.
 *
 * Only valid for templates with NO interpolation. The strings array is shared
 * across every evaluation of a given call site regardless of the values, so a
 * parameterized helper — `const themed = (c) => css`:host{color:${c}}`` —
 * would return the first call's sheet forever.
 */
const _identityCache = new WeakMap<TemplateStringsArray, CSSStyleSheet>();

/**
 * Tagged template for creating cached CSSStyleSheets.
 *
 * ```ts
 * const styles = css`
 *   :host { display: block; }
 *   button { padding: ${8}px; background: ${"#ff6b6b"}; }
 * `;
 * ```
 */
export function css(
  strings: TemplateStringsArray,
  ...values: CSSValue[]
): CSSStyleSheet {
  // Fast path: identity check on the TemplateStringsArray object.
  // Sound only when nothing is interpolated — see the note on _identityCache.
  const isStatic = values.length === 0;
  if (isStatic) {
    const hit = _identityCache.get(strings);
    if (hit) return hit;
  }

  // Build the string and check the text cache. Interpolated templates dedupe
  // here instead: same resulting CSS text -> same CSSStyleSheet.
  const text = String.raw(strings, ...values);
  let sheet = cssCache.get(text);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    cssCache.set(text, sheet);
  }
  if (isStatic) _identityCache.set(strings, sheet);
  return sheet;
}

/**
 * Adopt a stylesheet into a shadow root from either a tagged template or string.
 * Used internally by LoomElement.css().
 */
export function adoptCSS(
  shadow: ShadowRoot,
  stringsOrText: string | TemplateStringsArray,
  ...values: CSSValue[]
): void {
  const text =
    typeof stringsOrText === "string"
      ? stringsOrText
      : String.raw(stringsOrText, ...values);
  const sheet =
    cssCache.get(text) ??
    (() => {
      const s = new CSSStyleSheet();
      s.replaceSync(text);
      cssCache.set(text, s);
      return s;
    })();
  if (shadow.adoptedStyleSheets.indexOf(sheet) === -1) {
    shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.concat(sheet);
  }
}
