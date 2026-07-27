/**
 * Loom — CSS tagged template + cache
 *
 * Standalone css`` tag for creating reusable, cached CSSStyleSheets.
 * Same CSS string → same CSSStyleSheet instance (deduped across components).
 */

/**
 * Allowed types for css`` interpolation.
 *
 * A CSSStyleSheet is accepted so sheets compose: a shared fragment can be
 * interpolated into a component's stylesheet instead of being copied into it.
 * Without that, sharing a block of rules meant either duplicating the text or
 * adopting a second sheet, and the second sheet cannot be scoped -- so shared
 * blocks got pasted.
 */
export type CSSValue = string | number | CSSStyleSheet;

/**
 * Global cache -- same CSS string, same CSSStyleSheet instance.
 *
 * Bounded, because it is keyed by text and interpolation makes that unbounded:
 * a themed helper (`css`:host{color:${c}}``) or anything built from data mints
 * a new entry per distinct value and, uncapped, retains every sheet a page
 * ever produced. A static template never depends on this -- it is served from
 * the identity cache below, which is weakly keyed and cannot grow.
 *
 * Insertion-ordered, so the oldest entry is the first key Map yields. That
 * makes eviction a `keys().next()` rather than a second structure tracking
 * recency, which for a cache this size is not worth the bookkeeping.
 *
 * What eviction can cost: two *different* call sites with byte-identical CSS
 * share a sheet only while that text is still cached. After eviction they get
 * one each. That is a duplicate sheet, not a wrong style -- and a single call
 * site is unaffected either way, since it is served from the identity cache.
 */
const CACHE_LIMIT = 512;
const cssCache = new Map<string, CSSStyleSheet>();

/** Remember a sheet, evicting the oldest entry once the cache is full. */
function remember(text: string, sheet: CSSStyleSheet): void {
  if (cssCache.size >= CACHE_LIMIT) {
    const oldest = cssCache.keys().next();
    if (!oldest.done) cssCache.delete(oldest.value);
  }
  cssCache.set(text, sheet);
}

/**
 * The text each sheet was built from, so an interpolated sheet can be inlined.
 *
 * Read back from `sheet.cssRules` instead would reserialise on every
 * composition and lose anything the browser could not parse.
 */
const sheetText = new WeakMap<CSSStyleSheet, string>();

/** The text of a sheet built by css``, or "" for one built elsewhere. */
export function cssText(sheet: CSSStyleSheet): string {
  return sheetText.get(sheet) ?? "";
}

/** Interpolated sheets contribute their source text. */
function resolve(value: CSSValue): string | number {
  if (typeof value === "object" && value !== null) {
    const text = sheetText.get(value as CSSStyleSheet);
    if (text !== undefined) return text;
    // A sheet from somewhere else: serialise its rules, which is the best
    // available and still correct for anything the browser parsed.
    try {
      return Array.from((value as CSSStyleSheet).cssRules)
        .map((r) => r.cssText)
        .join("\n");
    } catch {
      return ""; // cross-origin sheet -- rules are not readable
    }
  }
  return value;
}

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
): CSSStyleSheet;
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
  const text = values.length === 0
    ? String.raw(strings)
    : String.raw(strings, ...values.map(resolve));
  let sheet = cssCache.get(text);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    remember(text, sheet);
    sheetText.set(sheet, text);
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
      remember(text, s);
      sheetText.set(s, text);
      return s;
    })();
  if (shadow.adoptedStyleSheets.indexOf(sheet) === -1) {
    shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.concat(sheet);
  }
}

// ── Lazy sheets ──────────────────────────────────────────────────────────────

/**
 * A stylesheet that has not been built yet.
 *
 * `css` constructs a `CSSStyleSheet` immediately, which is what you want in a
 * browser and impossible anywhere else: `new CSSStyleSheet()` does not exist in
 * Node, so a module holding `const styles = css`...`` at the top level throws
 * on *import*. Since that is how every component declares its styles, the whole
 * module graph becomes browser-only -- awkward for a framework that renders
 * declarative shadow DOM on a server, and for testing a component's logic
 * without a DOM.
 *
 * `css.lazy` defers construction to the first adopt. In Node the text is just
 * a string, so importing the module is inert.
 */
export interface LazyStyleSheet {
  /** Build (once) and return the real sheet. Requires a DOM. */
  readonly sheet: CSSStyleSheet;
  /** The CSS source, available with or without a DOM. */
  readonly text: string;
  readonly __loomLazy: true;
}

/** True for a lazy sheet, so consumers can accept either form. */
export function isLazySheet(v: unknown): v is LazyStyleSheet {
  return typeof v === "object" && v !== null && (v as LazyStyleSheet).__loomLazy === true;
}

/** Resolve either form to a real sheet. Only call where a DOM exists. */
export function toSheet(v: CSSStyleSheet | LazyStyleSheet): CSSStyleSheet {
  return isLazySheet(v) ? v.sheet : v;
}

const lazyCache = new WeakMap<TemplateStringsArray, LazyStyleSheet>();

/**
 * Like `css`, but nothing is constructed until the sheet is first used.
 *
 * ```ts
 * const styles = css.lazy`:host { display: block; }`;
 *
 * @component("my-el")
 * @styles(styles)          // adopts it, building the sheet at that moment
 * class MyEl extends LoomElement {}
 * ```
 *
 * Opt-in rather than the default: `css` returning a real `CSSStyleSheet` is
 * load-bearing for anyone who passes one to `adoptedStyleSheets` themselves,
 * and changing that under existing code to buy an import-time property most
 * apps never need would be the wrong trade.
 */
function lazy(strings: TemplateStringsArray, ...values: CSSValue[]): LazyStyleSheet {
  if (values.length === 0) {
    const hit = lazyCache.get(strings);
    if (hit) return hit;
  }

  const text = values.length === 0
    ? String.raw(strings)
    : String.raw(strings, ...values.map(resolve));

  let built: CSSStyleSheet | undefined;
  const handle: LazyStyleSheet = {
    __loomLazy: true,
    text,
    get sheet(): CSSStyleSheet {
      if (!built) {
        // Route through css`` so a lazy and an eager sheet with identical text
        // are the same object, and both land in one cache.
        built = cssCache.get(text);
        if (!built) {
          built = new CSSStyleSheet();
          built.replaceSync(text);
          remember(text, built);
          sheetText.set(built, text);
        }
      }
      return built;
    },
  };

  if (values.length === 0) lazyCache.set(strings, handle);
  return handle;
}

// Attached rather than exported separately: `css.lazy` reads as a variant of
// the same tag, which is what it is.
export declare namespace css {
  /** See {@link lazy}. */
  export const lazy: (strings: TemplateStringsArray, ...values: CSSValue[]) => LazyStyleSheet;
}
(css as unknown as { lazy: typeof lazy }).lazy = lazy;

/** @internal — cache size, for the bounded-growth test. */
export const __cacheSize = (): number => cssCache.size;
