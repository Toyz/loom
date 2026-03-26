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

/** Type for tracked events on an element */
export type LoomEventMap = Record<string, EventListener>;

/** Type for tracked JS properties on an element */
export type LoomPropMap = Record<string, unknown>;

/** Typed interface for Loom's DOM expando properties */
export interface LoomNode {
  __loomEvents?: LoomEventMap;
  __loomProps?: LoomPropMap;
  __loomRawHTML?: boolean;
  __childTemplate?: Node | Node[];
}

// ── Public API ──

/**
 * Morph the children of `root` (typically a ShadowRoot) to match `newTree`.
 * `newTree` can be a single Node or an array of Nodes (from Fragment).
 */
export function morph(root: ShadowRoot | HTMLElement, newTree: Node | Node[]): void {
  const newChildren = normalizeChildren(newTree);
  morphChildren(root, newChildren);
  // Release single-wrap reference to avoid retaining the last-morphed node
  _singleWrap[0] = null!;
}

// ── Core algorithm ──

function morphChildren(parent: Node, newChildren: ArrayLike<Node>): void {
  // Build keyed index & collect keep set in a single scan
  let oldKeyed: Map<string, Element> | null = null;
  let keepSet: Set<Node> | null = null;

  let current = parent.firstChild;
  while (current) {
    if (current.nodeType === 1) {
      const el = current as Element;
      const key = el.getAttribute("loom-key");
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

  for (let i = 0; i < newChildren.length; i++) {
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
        const ock = (oldChild as Element).getAttribute("loom-key");
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

    // Patch special DOM properties
    patchProperties(oldEl as HTMLElement, nextEl as HTMLElement);

    // Patch JSX-set JS properties (items, estimatedHeight, etc.)
    patchJSProps(oldEl as HTMLElement, nextEl as HTMLElement);

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

    // Snapshot childNodes — childNodes is a LIVE NodeList.
    // When morphChildren appends children from nextEl to oldEl,
    // the live list shrinks mid-iteration, skipping every other child.
    const nextChildren = nextEl.childNodes;
    const len = nextChildren.length;
    if (len > _snapshotBuf.length) _snapshotBuf.length = len;
    for (let i = 0; i < len; i++) _snapshotBuf[i] = nextChildren[i];
    // Create a fixed-length view so morphChildren sees exactly `len` items
    const snapshot = { length: len } as ArrayLike<Node>;
    for (let i = 0; i < len; i++) (snapshot as any)[i] = _snapshotBuf[i];
    morphChildren(oldEl, snapshot);
    // Shrink buffer if it grew past cap (from a one-off large list)
    if (_snapshotBuf.length > _SNAPSHOT_CAP) {
      _snapshotBuf.length = _SNAPSHOT_CAP;
    }
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
    }
    return;
  }

  // Fast path: old has attrs, next has none — bulk remove
  if (nextLen === 0 && oldLen > 0) {
    while (old.attributes.length > 0) {
      old.removeAttribute(old.attributes[0].name);
    }
    return;
  }

  // Add/update attributes from next
  for (let i = 0; i < nextLen; i++) {
    const { name, value } = nextAttrs[i];
    if (old.getAttribute(name) !== value) {
      old.setAttribute(name, value);
    }
  }

  // Remove attributes not in next
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const { name } = oldAttrs[i];
    if (!next.hasAttribute(name)) {
      old.removeAttribute(name);
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

// ── DOM property patching ──

const PROP_KEYS = ["value", "checked", "selected", "indeterminate"] as const;

function patchProperties(old: HTMLElement, next: HTMLElement): void {
  for (let i = 0; i < PROP_KEYS.length; i++) {
    const key = PROP_KEYS[i];
    if (key in next && (old as unknown as Record<string, unknown>)[key] !== (next as unknown as Record<string, unknown>)[key]) {
      (old as unknown as Record<string, unknown>)[key] = (next as unknown as Record<string, unknown>)[key];
    }
  }
}

// ── JSX JS-property patching ──

function patchJSProps(old: HTMLElement, next: HTMLElement): void {
  const newProps: LoomPropMap | undefined = (next as unknown as LoomNode).__loomProps;
  const oldProps: LoomPropMap | undefined = (old as unknown as LoomNode).__loomProps;
  // Early exit: both have no JS props
  if (!newProps && !oldProps) return;
  const op: LoomPropMap = oldProps ?? Object.create(null);

  // Remove old props not in new
  for (const key in op) {
    if (!newProps || !(key in newProps)) {
      delete op[key];
    }
  }

  // Set/update props from new
  if (newProps) {
    setReadonlyBypass(true);
    try {
      for (const key in newProps) {
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

function getKey(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  return (node as Element).getAttribute("loom-key");
}

function isKeep(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  return (node as Element).hasAttribute("loom-keep");
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

/** Pooled snapshot buffer — grows to match the largest childNodes list, avoids per-element allocation */
let _snapshotBuf: Node[] = [];
/** Cap for snapshot buffer — prevents unbounded growth from one-off large lists */
const _SNAPSHOT_CAP = 256;

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
