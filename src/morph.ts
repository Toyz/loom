/**
 * Loom — DOM Morph
 *
 * Patches an existing DOM tree to match a new tree, in-place.
 * Only touches what actually changed — text, attributes, structure.
 * Event listeners are tracked via __loomEvents expando for diffing.
 *
 * Key features:
 *   - Keyed reconciliation via `loom-key`
 *   - `loom-keep` skips nodes entirely (escape hatch for imperative DOM)
 *   - Preserves focus, selection, scroll position
 *   - Concurrent-safe: void update() = no morph, returned Node = auto-morph
 */

import { setReadonlyBypass } from "./store/readonly";

/** Expando key for tracked event listeners */
export const LOOM_EVENTS = "__loomEvents";

/** Expando key for tracked JS properties (non-attribute, non-event) */
export const LOOM_PROPS = "__loomProps";

/** Attribute name for keyed reconciliation — expando `__loomKey` mirrors it to skip getAttribute in hot paths */
export const LOOM_KEY_ATTR = "loom-key";

/** Type for tracked events on an element */
export type LoomEventMap = Record<string, EventListener>;

/** Type for tracked JS properties on an element */
export type LoomPropMap = Record<string, unknown>;

/** Typed interface for Loom's DOM expando properties */
export interface LoomNode {
  __loomEvents?: LoomEventMap;
  __loomProps?: LoomPropMap;
  /** Value each __loomProps key held before Loom first wrote it — restored on removal */
  __loomPropPrior?: LoomPropMap;
  __loomRawHTML?: boolean;
  __childTemplate?: Node | Node[];
  /** Mirrors `loom-key` when set via JSX or patchAttributes — undefined means fall back to getAttribute */
  __loomKey?: string;
}

// ── Morph hooks ──

/** Called for every morphed element pair, after props are patched. */
export type MorphHook = (old: Element, next: Element) => void;

const _morphHooks: MorphHook[] = [];

/**
 * @internal — register a per-element expando transfer.
 *
 * Used by @attribute to forward `__loomAttrArgs` from the freshly-built JSX
 * element onto the live one. Lives here rather than in attribute.ts because
 * attribute.ts imports morph, and the dependency must not go both ways. Costs
 * one length check per element when nothing is registered.
 */
export function registerMorphHook(fn: MorphHook): void {
  _morphHooks.push(fn);
}

// ── Public API ──

/**
 * Morph the children of `root` (typically a ShadowRoot) to match `newTree`.
 * `newTree` can be a single Node or an array of Nodes (from Fragment).
 */
export function morph(root: ShadowRoot | HTMLElement, newTree: Node | Node[]): void {
  const newChildren = normalizeChildren(newTree);
  morphChildren(root, newChildren, newChildren.length);
  // Release single-wrap reference to avoid retaining the last-morphed node
  _singleWrap[0] = null!;
}

// ── Core algorithm ──

function morphChildren(parent: Node, newChildren: ArrayLike<Node>, childCount = newChildren.length): void {
  // Build keyed index & collect keep set in a single scan
  let oldKeyed: Map<string, Element> | null = null;
  let keepSet: Set<Node> | null = null;

  let current = parent.firstChild;
  while (current) {
    if (current.nodeType === 1) {
      const el = current as Element;
      const key = readLoomKey(el);
      if (key) {
        if (!oldKeyed) { oldKeyed = _keyedPool.pop() ?? new Map(); }
        oldKeyed.set(key, el);
      }
      if (el.hasAttribute("loom-keep")) {
        if (!keepSet) keepSet = new Set();
        keepSet.add(el);
      }
    }
    current = current.nextSibling;
  }

  let oldChild = parent.firstChild;

  for (let i = 0; i < childCount; i++) {
    const newChild = newChildren[i];
    const newKey = getKey(newChild);

    // Keyed match
    if (newKey && oldKeyed && oldKeyed.has(newKey)) {
      const match = oldKeyed.get(newKey)!;
      oldKeyed.delete(newKey);

      if (oldChild === match) {
        morphNode(match, newChild as Element);
        oldChild = oldChild.nextSibling;
      } else {
        morphNode(match, newChild as Element);
        parent.insertBefore(match, oldChild);
      }
      continue;
    }

    // Skip unconsumed keyed nodes or kept nodes
    while (oldChild) {
      if (oldKeyed && oldChild.nodeType === 1) {
        const ock = readLoomKey(oldChild as Element);
        if (ock && oldKeyed.has(ock)) { oldChild = oldChild.nextSibling; continue; }
      }
      if (keepSet && keepSet.has(oldChild)) {
        oldChild = oldChild.nextSibling; continue;
      }
      break;
    }

    if (!oldChild) {
      // No more old children — append
      parent.appendChild(newChild);
      continue;
    }

    if (canMorph(oldChild, newChild)) {
      morphNode(oldChild, newChild);
      oldChild = oldChild.nextSibling;
    } else {
      // Can't morph — insert new before old
      parent.insertBefore(newChild, oldChild);
    }
  }

  // Remove unconsumed old children
  while (oldChild) {
    const next = oldChild.nextSibling;
    const isKept = keepSet && keepSet.has(oldChild);
    const oldKey = getKey(oldChild);
    const isUnconsumedKeyed = oldKeyed && oldKey && oldKeyed.has(oldKey);
    if (!isKept && !isUnconsumedKeyed) {
      parent.removeChild(oldChild);
    }
    oldChild = next;
  }

  // Also remove unconsumed keyed nodes that were skipped
  if (oldKeyed) {
    for (const old of oldKeyed.values()) {
      if (!keepSet || !keepSet.has(old)) {
        parent.removeChild(old);
      }
    }
    // Return pooled keyed map
    oldKeyed.clear();
    _keyedPool.push(oldKeyed);
  }
}

/** Morph a single node in-place. */
function morphNode(old: Node, next: Node): void {
  // Identity short-circuit — same node, nothing to diff
  if (old === next) return;

  // Text nodes
  if (old.nodeType === Node.TEXT_NODE && next.nodeType === Node.TEXT_NODE) {
    if (old.textContent !== next.textContent) {
      old.textContent = next.textContent;
    }
    return;
  }

  // Comment nodes
  if (old.nodeType === Node.COMMENT_NODE && next.nodeType === Node.COMMENT_NODE) {
    if (old.textContent !== next.textContent) {
      old.textContent = next.textContent;
    }
    return;
  }

  // Element nodes
  if (old.nodeType === Node.ELEMENT_NODE && next.nodeType === Node.ELEMENT_NODE) {
    const oldEl = old as Element;
    const nextEl = next as Element;

    // Patch attributes — skip if both have none
    const oldAttrLen = oldEl.attributes.length;
    const nextAttrLen = nextEl.attributes.length;
    if (oldAttrLen > 0 || nextAttrLen > 0) {
      patchAttributes(oldEl, nextEl);
    }

    // Patch event listeners
    patchEvents(oldEl, nextEl);

    // Patch JSX-set JS properties (value, checked, items, estimatedHeight, …)
    patchJSProps(oldEl as HTMLElement, nextEl as HTMLElement);

    // Per-element expando transfer registered by opt-in features (@attribute)
    if (_morphHooks.length > 0) {
      for (let i = 0; i < _morphHooks.length; i++) _morphHooks[i](oldEl, nextEl);
    }

    // innerHTML / rawHTML — if the new element used rawHTML, just slam it
    // The JSX runtime sets a __loomRawHTML marker
    if ((nextEl as unknown as LoomNode).__loomRawHTML) {
      if (oldEl.innerHTML !== nextEl.innerHTML) {
        oldEl.innerHTML = nextEl.innerHTML;
      }
      return; // Don't recurse into rawHTML children
    }

    // Light DOM custom elements manage their own children — don't recurse.
    // Just like shadow DOM elements, the parent morph only patches attributes.
    if ((oldEl.constructor as unknown as Record<string, unknown>)?.__loom_noshadow) {
      return;
    }

    // Snapshot childNodes — childNodes is a LIVE NodeList. When morphChildren
    // appends children from nextEl to oldEl the live list shrinks
    // mid-iteration, skipping every other child.
    //
    // A per-call array, not a shared pooled buffer: morphNode() recurses, so
    // the buffer could not be reused anyway — the old code copied it into a
    // freshly allocated `{length: n}` object with integer keys, which V8 puts
    // in a slow dictionary backing store. That was two copies plus an
    // allocation to produce something slower than this, and the pooled buffer
    // also retained detached DOM nodes after the morph finished.
    const nextChildren = nextEl.childNodes;
    const len = nextChildren.length;
    const snapshot = new Array<Node>(len);
    for (let i = 0; i < len; i++) snapshot[i] = nextChildren[i]!;
    morphChildren(oldEl, snapshot, len);
  }
}

// ── Attribute diffing ──

function patchAttributes(old: Element, next: Element): void {
  const nextAttrs = next.attributes;
  const oldAttrs = old.attributes;
  const nextLen = nextAttrs.length;
  const oldLen = oldAttrs.length;

  // Fast path: next has attrs, old has none — bulk add
  if (oldLen === 0 && nextLen > 0) {
    for (let i = 0; i < nextLen; i++) {
      const { name, value } = nextAttrs[i];
      old.setAttribute(name, value);
      if (name === LOOM_KEY_ATTR) (old as unknown as LoomNode).__loomKey = value;
    }
    return;
  }

  // Fast path: old has attrs, next has none — bulk remove
  if (nextLen === 0 && oldLen > 0) {
    while (old.attributes.length > 0) {
      old.removeAttribute(old.attributes[0].name);
    }
    delete (old as unknown as LoomNode).__loomKey;
    return;
  }

  // Add/update attributes from next
  for (let i = 0; i < nextLen; i++) {
    const { name, value } = nextAttrs[i];
    if (old.getAttribute(name) !== value) {
      old.setAttribute(name, value);
      if (name === LOOM_KEY_ATTR) (old as unknown as LoomNode).__loomKey = value;
    }
  }

  // Remove attributes not in next
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const { name } = oldAttrs[i];
    if (!next.hasAttribute(name)) {
      old.removeAttribute(name);
      if (name === LOOM_KEY_ATTR) delete (old as unknown as LoomNode).__loomKey;
    }
  }
}

export function loomEventProxy(this: Element, e: Event): void {
  const handler = ((this as unknown as LoomNode).__loomEvents)?.[e.type];
  if (typeof handler === "function") {
    handler.call(this, e);
  } else if (handler && typeof (handler as unknown as { handleEvent?: Function }).handleEvent === "function") {
    (handler as unknown as { handleEvent: (e: Event) => void }).handleEvent(e);
  }
}

function patchEvents(old: Element, next: Element): void {
  const oldEvents: LoomEventMap | undefined = (old as unknown as LoomNode).__loomEvents;
  const newEvents: LoomEventMap | undefined = (next as unknown as LoomNode).__loomEvents;
  // Early exit: both have no events
  if (!oldEvents && !newEvents) return;
  const oe: LoomEventMap = oldEvents ?? Object.create(null);
  const ne: LoomEventMap = newEvents ?? Object.create(null);

  // Remove old listeners not in new
  for (const type in oe) {
    if (!(type in ne)) {
      old.removeEventListener(type, loomEventProxy);
      delete oe[type];
    }
  }

  // Add/replace listeners from new
  let hasNew = false;
  for (const type in ne) {
    hasNew = true;
    if (!(type in oe)) {
      old.addEventListener(type, loomEventProxy);
    }
    oe[type] = ne[type];
  }

  // Transfer the record to old element if new has any events
  if (hasNew) {
    (old as unknown as LoomNode).__loomEvents = oe;
  }
}

// ── JSX JS-property patching ──
//
// There used to be a separate patchProperties() that copied value/checked/
// selected/indeterminate whenever `key in next`. That test is true for ANY
// <input>/<option> regardless of what the template declared, so every full
// morph reset the live element to the freshly-created one's defaults and wiped
// whatever the user had typed or ticked. jsx() now records those keys in
// __loomProps when — and only when — the template actually set them, so
// patchJSProps below is the single path and undeclared form state is left
// alone.

/** Form-state properties that must never be reset to undefined on removal. */
const FORM_PROP_KEYS = new Set(["value", "checked", "selected", "indeterminate"]);

function patchJSProps(old: HTMLElement, next: HTMLElement): void {
  const newProps: LoomPropMap | undefined = (next as unknown as LoomNode).__loomProps;
  const oldProps: LoomPropMap | undefined = (old as unknown as LoomNode).__loomProps;
  // Early exit: both have no JS props
  if (!newProps && !oldProps) return;
  const op: LoomPropMap = oldProps ?? Object.create(null);

  // Remove props the template no longer declares. Dropping the bookkeeping
  // entry alone left the live JS property set — a child component kept
  // rendering `items` after the parent stopped passing it — so restore the
  // value the element had before Loom first wrote that key.
  let removed: string[] | null = null;
  for (const key in op) {
    if (!newProps || !(key in newProps)) {
      (removed ??= []).push(key);
    }
  }
  if (removed) {
    const prior = (old as unknown as LoomNode).__loomPropPrior;
    setReadonlyBypass(true);
    try {
      for (let i = 0; i < removed.length; i++) {
        const key = removed[i];
        if (prior && key in prior) {
          (old as unknown as Record<string, unknown>)[key] = prior[key];
          delete prior[key];
        } else if (!FORM_PROP_KEYS.has(key)) {
          // No recorded prior (the element was appended, never morphed, so we
          // never saw its pristine value). Clearing is still right for data
          // props — otherwise a child keeps rendering the array its parent
          // stopped passing. Form props are exempt: assigning undefined to
          // `value` stringifies to "undefined", and a control the template no
          // longer drives should simply become uncontrolled.
          (old as unknown as Record<string, unknown>)[key] = undefined;
        }
        delete op[key];
      }
    } finally {
      setReadonlyBypass(false);
    }
  }

  // Set/update props from new
  if (newProps) {
    setReadonlyBypass(true);
    try {
      for (const key in newProps) {
        // Capture the pre-Loom value once, the first time we write this key,
        // so removal can put it back.
        if (!(key in op)) {
          let prior = (old as unknown as LoomNode).__loomPropPrior;
          if (!prior) { prior = Object.create(null); (old as unknown as LoomNode).__loomPropPrior = prior!; }
          if (!(key in prior!)) prior![key] = (old as unknown as Record<string, unknown>)[key];
        }
        if ((old as unknown as Record<string, unknown>)[key] !== newProps[key]) {
          (old as unknown as Record<string, unknown>)[key] = newProps[key];
        }
        op[key] = newProps[key];
      }
    } finally {
      setReadonlyBypass(false);
    }
    (old as unknown as LoomNode).__loomProps = op;
  }
}

// ── Helpers ──

/** Read keyed reconcile id — prefers `__loomKey` expando (JSX / patchAttributes) over getAttribute */
function readLoomKey(el: Element): string | null {
  const n = el as unknown as LoomNode;
  if (n.__loomKey !== undefined) return n.__loomKey;
  return el.getAttribute(LOOM_KEY_ATTR);
}

function getKey(node: Node | undefined | null): string | null {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;
  return readLoomKey(node as Element);
}

function canMorph(old: Node, next: Node): boolean {
  // Same node type
  if (old.nodeType !== next.nodeType) return false;
  // Text/comment nodes always morphable
  if (old.nodeType === Node.TEXT_NODE || old.nodeType === Node.COMMENT_NODE) return true;
  // Elements must share tag name
  if (old.nodeType === Node.ELEMENT_NODE) {
    return (old as Element).tagName === (next as Element).tagName;
  }
  return false;
}

/** Pooled keyed Map — avoids allocation per keyed morph */
const _keyedPool: Map<string, Element>[] = [];

/** Reusable single-element wrapper to avoid allocating [tree] on every call */
const _singleWrap: Node[] = [null!];

function normalizeChildren(tree: Node | Node[]): ArrayLike<Node> {
  if (Array.isArray(tree)) return tree;
  // DocumentFragment — must snapshot because morphChildren moves nodes
  // out of the fragment, mutating the live childNodes list
  if (tree.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    const nodes = tree.childNodes;
    const arr: Node[] = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) arr[i] = nodes[i];
    return arr;
  }
  _singleWrap[0] = tree;
  return _singleWrap;
}
