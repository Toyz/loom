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

/** Expando key for tracked event listeners */
export const LOOM_EVENTS = "__loomEvents";

/** Expando key for tracked JS properties (non-attribute, non-event) */
export const LOOM_PROPS = "__loomProps";

/** Type for tracked events on an element */
export type LoomEventMap = Map<string, EventListener>;

/** Type for tracked JS properties on an element */
export type LoomPropMap = Map<string, any>;

// ── Public API ──

/**
 * Morph the children of `root` (typically a ShadowRoot) to match `newTree`.
 * `newTree` can be a single Node or an array of Nodes (from Fragment).
 */
export function morph(root: ShadowRoot | HTMLElement, newTree: Node | Node[]): void {
  const newChildren = normalizeChildren(newTree);
  morphChildren(root, newChildren);
}

// ── Core algorithm ──

function morphChildren(parent: Node, newChildren: Node[]): void {
  // Build keyed index & optionally collect keep elements
  let oldKeyed: Map<string, Element> | null = null;
  let hasKeep = false;

  let current = parent.firstChild;
  while (current) {
    const key = getKey(current);
    if (key) {
      if (!oldKeyed) oldKeyed = new Map();
      oldKeyed.set(key, current as Element);
    }
    if (isKeep(current)) hasKeep = true;
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
    while (oldChild && (
      (oldKeyed && getKey(oldChild) && oldKeyed.has(getKey(oldChild)!)) ||
      (hasKeep && isKeep(oldChild))
    )) {
      oldChild = oldChild.nextSibling;
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
    const isUnconsumedKeyed = oldKeyed && getKey(oldChild) && oldKeyed.has(getKey(oldChild)!);
    if (!isKeep(oldChild) && !isUnconsumedKeyed) {
      parent.removeChild(oldChild);
    }
    oldChild = next;
  }

  // Also remove unconsumed keyed nodes that were skipped
  if (oldKeyed) {
    for (const old of oldKeyed.values()) {
      if (!isKeep(old)) {
        parent.removeChild(old);
      }
    }
  }
}

/** Morph a single node in-place. */
function morphNode(old: Node, next: Node): void {
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

    // Patch attributes
    patchAttributes(oldEl, nextEl);

    // Patch event listeners
    patchEvents(oldEl, nextEl);

    // Patch special DOM properties
    patchProperties(oldEl as HTMLElement, nextEl as HTMLElement);

    // Patch JSX-set JS properties (items, estimatedHeight, etc.)
    patchJSProps(oldEl as HTMLElement, nextEl as HTMLElement);

    // innerHTML / rawHTML — if the new element used rawHTML, just slam it
    // The JSX runtime sets a __loomRawHTML marker
    if ((nextEl as any).__loomRawHTML) {
      if (oldEl.innerHTML !== nextEl.innerHTML) {
        oldEl.innerHTML = nextEl.innerHTML;
      }
      return; // Don't recurse into rawHTML children
    }

    // Light DOM custom elements manage their own children — don't recurse.
    // Just like shadow DOM elements, the parent morph only patches attributes.
    if ((oldEl as any).constructor?.__loom_noshadow) {
      return;
    }

    // Recurse children
    morphChildren(oldEl, Array.from(nextEl.childNodes));
  }
}

// ── Attribute diffing ──

function patchAttributes(old: Element, next: Element): void {
  // Add/update attributes from next
  const nextAttrs = next.attributes;
  for (let i = 0; i < nextAttrs.length; i++) {
    const { name, value } = nextAttrs[i];
    if (old.getAttribute(name) !== value) {
      old.setAttribute(name, value);
    }
  }

  // Remove attributes not in next
  const oldAttrs = old.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const { name } = oldAttrs[i];
    if (!next.hasAttribute(name)) {
      old.removeAttribute(name);
    }
  }
}

export function loomEventProxy(this: Element, e: Event): void {
  const handler = ((this as any)[LOOM_EVENTS] as LoomEventMap)?.get(e.type);
  if (typeof handler === "function") {
    handler.call(this, e);
  } else if (handler && typeof (handler as any).handleEvent === "function") {
    (handler as any).handleEvent(e);
  }
}

function patchEvents(old: Element, next: Element): void {
  const oldEvents: LoomEventMap = (old as any)[LOOM_EVENTS] ?? new Map();
  const newEvents: LoomEventMap = (next as any)[LOOM_EVENTS] ?? new Map();

  // Remove old listeners not in new
  for (const type of oldEvents.keys()) {
    if (!newEvents.has(type)) {
      old.removeEventListener(type, loomEventProxy);
      oldEvents.delete(type);
    }
  }

  // Add/replace listeners from new
  for (const [type, listener] of newEvents) {
    if (!oldEvents.has(type)) {
      old.addEventListener(type, loomEventProxy);
    }
    oldEvents.set(type, listener);
  }

  // Transfer the map to old element
  if (newEvents.size > 0) {
    (old as any)[LOOM_EVENTS] = oldEvents;
  }
}

// ── DOM property patching ──

const PROP_KEYS = ["value", "checked", "selected", "indeterminate"] as const;

function patchProperties(old: HTMLElement, next: HTMLElement): void {
  for (const key of PROP_KEYS) {
    if (key in next && (old as any)[key] !== (next as any)[key]) {
      (old as any)[key] = (next as any)[key];
    }
  }
}

// ── JSX JS-property patching ──

function patchJSProps(old: HTMLElement, next: HTMLElement): void {
  const newProps: LoomPropMap | undefined = (next as any)[LOOM_PROPS];
  const oldProps: LoomPropMap = (old as any)[LOOM_PROPS] ?? new Map();

  // Remove old props not in new
  for (const key of oldProps.keys()) {
    if (!newProps?.has(key)) {
      oldProps.delete(key);
    }
  }

  // Set/update props from new
  if (newProps) {
    for (const [key, val] of newProps) {
      if ((old as any)[key] !== val) {
        (old as any)[key] = val;
      }
      oldProps.set(key, val);
    }
    (old as any)[LOOM_PROPS] = oldProps;
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

function normalizeChildren(tree: Node | Node[]): Node[] {
  if (Array.isArray(tree)) return tree;
  // DocumentFragment — extract children
  if (tree.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return Array.from(tree.childNodes);
  }
  return [tree];
}
