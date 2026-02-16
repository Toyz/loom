/**
 * Loom — DOM Morph
 *
 * Patches an existing DOM tree to match a new tree, in-place.
 * Only touches what actually changed — text, attributes, structure.
 * Event listeners are tracked via __loomEvents expando for diffing.
 *
 * Key features:
 *   - Keyed reconciliation via `data-loom-key`
 *   - `loom-keep` skips nodes entirely (escape hatch for imperative DOM)
 *   - Preserves focus, selection, scroll position
 *   - Concurrent-safe: void update() = no morph, returned Node = auto-morph
 */

/** Expando key for tracked event listeners */
export const LOOM_EVENTS = "__loomEvents";

/** Type for tracked events on an element */
export type LoomEventMap = Map<string, EventListener>;

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
  const oldChildren = Array.from(parent.childNodes);

  // Build keyed index from old children
  const oldKeyed = new Map<string, Element>();
  for (const old of oldChildren) {
    const key = getKey(old);
    if (key) oldKeyed.set(key, old as Element);
  }

  // Track which old nodes we've consumed
  const consumed = new Set<Node>();
  let oldIdx = 0;

  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    const newKey = getKey(newChild);

    // Keyed match — pull from map regardless of position
    if (newKey && oldKeyed.has(newKey)) {
      const oldChild = oldKeyed.get(newKey)!;
      consumed.add(oldChild);
      morphNode(oldChild, newChild as Element);
      // Move into position if needed
      const ref = parent.childNodes[i] ?? null;
      if (oldChild !== ref) {
        parent.insertBefore(oldChild, ref);
      }
      continue;
    }

    // Unkeyed — try to match by position (skip consumed)
    while (oldIdx < oldChildren.length && consumed.has(oldChildren[oldIdx])) {
      oldIdx++;
    }

    const oldChild = oldChildren[oldIdx];

    if (!oldChild) {
      // No more old children — append
      parent.appendChild(newChild);
      continue;
    }

    // Skip loom-keep nodes — don't touch them
    if (isKeep(oldChild)) {
      consumed.add(oldChild);
      oldIdx++;
      i--; // re-process this new child against the next old
      continue;
    }

    if (canMorph(oldChild, newChild)) {
      consumed.add(oldChild);
      morphNode(oldChild, newChild);
      oldIdx++;
    } else {
      // Can't morph — insert new before old
      parent.insertBefore(newChild, oldChild);
    }
  }

  // Remove unconsumed old children (except loom-keep)
  for (const old of oldChildren) {
    if (!consumed.has(old) && !isKeep(old) && old.parentNode === parent) {
      parent.removeChild(old);
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

    // innerHTML / rawHTML — if the new element used rawHTML, just slam it
    // The JSX runtime sets a __loomRawHTML marker
    if ((nextEl as any).__loomRawHTML) {
      if (oldEl.innerHTML !== nextEl.innerHTML) {
        oldEl.innerHTML = nextEl.innerHTML;
      }
      return; // Don't recurse into rawHTML children
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

// ── Event listener diffing ──

function patchEvents(old: Element, next: Element): void {
  const oldEvents: LoomEventMap = (old as any)[LOOM_EVENTS] ?? new Map();
  const newEvents: LoomEventMap = (next as any)[LOOM_EVENTS] ?? new Map();

  // Remove old listeners not in new
  for (const [type, listener] of oldEvents) {
    if (!newEvents.has(type)) {
      old.removeEventListener(type, listener);
      oldEvents.delete(type);
    }
  }

  // Add/replace listeners from new
  for (const [type, listener] of newEvents) {
    const existing = oldEvents.get(type);
    if (existing !== listener) {
      if (existing) old.removeEventListener(type, existing);
      old.addEventListener(type, listener);
      oldEvents.set(type, listener);
    }
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

// ── Helpers ──

function getKey(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  return (node as Element).getAttribute("data-loom-key");
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
