/**
 * Loom — @selection and the CSS Custom Highlight API
 *
 * Two related things the platform does better than the usual workaround.
 *
 * `@selection` reports what the user has selected, cleaned up on disconnect --
 * `selectionchange` fires on `document`, so a component that listens without
 * removing keeps receiving events for a page it is no longer part of.
 *
 * {@link highlight} styles ranges of text *without wrapping them in elements*.
 * The wrapping approach -- the one every search-term highlighter reaches for
 * -- rewrites the DOM to insert `<mark>`, which destroys the user's selection,
 * moves focus, invalidates any node references held elsewhere, and forces a
 * re-layout of the whole block. A custom highlight paints over the existing
 * text and touches none of it.
 */

import { createDecorator } from "../decorators/create.js";

// ── Selection ────────────────────────────────────────────────────────────────

export interface SelectionInfo {
  /** The selected text, empty when the selection is collapsed. */
  text: string;
  /** The live selection range, or null when there is none. */
  range: Range | null;
  /** True when the selection is inside this component. */
  within: boolean;
}

/** Read the current selection, relative to a host element. */
export function readSelection(host?: Node): SelectionInfo {
  const sel = typeof getSelection === "function" ? getSelection() : null;
  if (!sel || sel.rangeCount === 0) return { text: "", range: null, within: false };

  const range = sel.getRangeAt(0);
  let within = false;
  if (host) {
    const anchor = sel.anchorNode;
    // A shadow root's contents are not `contains`-reachable from the host in
    // every engine, so check the root as well.
    const root = (host as { shadowRoot?: ShadowRoot | null }).shadowRoot;
    within = Boolean(
      (anchor && host.contains(anchor)) ||
      (anchor && root && (root as unknown as Node).contains(anchor)),
    );
  }
  return { text: sel.toString(), range, within };
}

/**
 * Call a method whenever the document selection changes.
 *
 * ```ts
 * @selection()
 * onSelect(info: SelectionInfo) {
 *   if (info.within) this.quote = info.text;
 * }
 *
 * @selection({ withinOnly: true })
 * onOwnSelect(info: SelectionInfo) { ... }
 * ```
 *
 * `selectionchange` fires on `document`, not on the element, so this is a
 * document-level listener that has to be removed when the component goes --
 * the usual hand-rolled version is not, and keeps firing at a detached host.
 */
export const selection = createDecorator<[opts?: { withinOnly?: boolean }]>(
  (method, _key, opts = {}) => {
    return (el: any) => {
      const handler = () => {
        const info = readSelection(el);
        if (opts.withinOnly && !info.within) return;
        method.call(el, info);
      };
      document.addEventListener("selectionchange", handler);
      return () => document.removeEventListener("selectionchange", handler);
    };
  },
);

// ── CSS Custom Highlight ─────────────────────────────────────────────────────

/** True where CSS.highlights exists. */
export const supportsHighlights = (): boolean => {
  const css = (globalThis as { CSS?: { highlights?: unknown } }).CSS;
  return Boolean(css && css.highlights);
};

/**
 * Paint ranges under a named highlight, styleable with `::highlight(name)`.
 *
 * ```ts
 * const clear = highlight("search", ranges);
 * // CSS:  ::highlight(search) { background: yellow; }
 * clear();   // removes it
 * ```
 *
 * Nothing in the DOM changes: no wrapper elements, no text nodes split, no
 * selection lost, no re-layout. Returns a function that removes the
 * highlight, and a no-op where the API is missing (Firefox before 140) so
 * callers do not have to branch.
 */
export function highlight(name: string, ranges: Range[]): () => void {
  if (!supportsHighlights() || ranges.length === 0) return () => {};

  const css = (globalThis as unknown as {
    CSS: { highlights: Map<string, unknown> };
  }).CSS;
  const HighlightCtor = (globalThis as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  if (typeof HighlightCtor !== "function") return () => {};

  try {
    css.highlights.set(name, new HighlightCtor(...ranges));
  } catch {
    return () => {};
  }
  return () => {
    try { css.highlights.delete(name); } catch { /* already gone */ }
  };
}

/**
 * Find every occurrence of `term` under `root` and return ranges for them.
 *
 * Pairs with {@link highlight} for the search-term case, which is the one
 * that otherwise ends up rewriting the DOM.
 */
export function findRanges(root: Node, term: string): Range[] {
  const ranges: Range[] = [];
  if (!term) return ranges;

  const needle = term.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue?.toLowerCase();
    if (!text) continue;
    let from = text.indexOf(needle);
    while (from !== -1) {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, from + needle.length);
      ranges.push(range);
      from = text.indexOf(needle, from + needle.length);
    }
  }
  return ranges;
}
