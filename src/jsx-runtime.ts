/**
 * Loom — JSX Runtime (automatic mode)
 *
 * Zero vDOM. JSX compiles directly to DOM elements.
 * Configure via tsconfig: "jsxImportSource": "loom"
 */

import {
  LOOM_KEY_ATTR,
  loomEventProxy,
  type LoomEventMap,
  type LoomPropMap,
  type LoomNode,
} from "./morph.js";
import { startSubTrace, endSubTrace, addBinding } from "./trace.js";
import { hasRegisteredAttributes, isRegisteredAttr, setAttrArg } from "./element/attribute.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg", "path", "circle", "rect", "line", "polyline", "polygon",
  "text", "g", "defs", "use", "clipPath", "mask", "filter",
  "linearGradient", "radialGradient", "stop", "foreignObject",
  "marker", "symbol", "pattern", "ellipse", "image", "tspan",
]);

/** Properties that must be set as JS properties, not HTML attributes */
const PROP_KEYS = new Set(["value", "checked", "selected", "indeterminate"]);

/**
 * Record a JS property Loom set, so morph knows to patch it on the live
 * element — and, for PROP_KEYS, so morph knows it may touch that property at
 * all. Anything not recorded here is user/browser state morph must not clobber.
 */
function trackProp(el: Element, key: string, val: unknown): void {
  const n = el as unknown as LoomNode;
  let tracked = n.__loomProps;
  if (!tracked) { tracked = Object.create(null); n.__loomProps = tracked!; }
  tracked![key] = val;
}

/**
 * Write one already-evaluated prop value onto an element.
 *
 * Used by the closure-binding branch for both the initial application and the
 * patcher, so the two can never disagree about where a given key belongs
 * (className vs class attribute, style object vs string, PROP_KEYS as JS
 * properties, booleans as attribute presence).
 */
function applyProp(el: HTMLElement | SVGElement, key: string, val: unknown, isSVG: boolean): void {
  if (key === "className" || key === "class") {
    if (isSVG) el.setAttribute("class", '' + val);
    else (el as HTMLElement).className = '' + val;
  } else if (key === "style") {
    if (val && typeof val === "object") Object.assign((el as HTMLElement).style, val);
    else el.setAttribute("style", '' + val);
  } else if (key === "htmlFor") {
    el.setAttribute("for", '' + val);
  } else if (PROP_KEYS.has(key)) {
    (el as unknown as Record<string, unknown>)[key] = val;
    trackProp(el, key, val);
  } else if (typeof val === "boolean") {
    if (key === "draggable" || key === "contentEditable" || key === "spellcheck") {
      el.setAttribute(key, val ? "true" : "false");
    } else {
      val ? el.setAttribute(key, "") : el.removeAttribute(key);
    }
  } else if (val == null) {
    el.removeAttribute(key);
  } else {
    const s = '' + val;
    el.setAttribute(key, s);
    if (key === LOOM_KEY_ATTR) (el as unknown as LoomNode).__loomKey = s;
  }
}

/**
 * Cache event type strings: "onClick" → "click", "onInput" → "input"
 * Avoids allocating a new .slice(2).toLowerCase() string per jsx() call.
 */
const _eventTypeCache: Record<string, string> = {};

/**
 * V8 optimization: cloneNode(false) is 2-3x faster than createElement.
 * Cache template elements for repeated tag names.
 */
const _elCache: Record<string, HTMLElement> = {};
const _svgCache: Record<string, SVGElement> = {};

function acquireElement(tag: string, isSVG: boolean, isCustom: boolean): HTMLElement | SVGElement {
  if (isSVG) {
    let tmpl = _svgCache[tag];
    if (!tmpl) { tmpl = document.createElementNS(SVG_NS, tag) as SVGElement; _svgCache[tag] = tmpl; }
    return tmpl.cloneNode(false) as SVGElement;
  }
  // Custom elements (tag contains hyphen) MUST use createElement — cloneNode
  // does NOT call the custom element constructor, breaking shadow DOM, reactivity, etc.
  // The hyphen test is passed in so jsx() computes it once per call.
  if (isCustom) return document.createElement(tag);
  let tmpl = _elCache[tag];
  if (!tmpl) { tmpl = document.createElement(tag); _elCache[tag] = tmpl; }
  return tmpl.cloneNode(false) as HTMLElement;
}

export function jsx(
  tag: string | Function,
  props: Record<string, unknown>,
): HTMLElement | SVGElement | DocumentFragment {
  if (typeof tag === "function") return tag(props);

  // Fast SVG rejection: SVG tags only start with c,d,e,f,g,i,l,m,p,r,s,t,u
  // Common HTML tags (div, span, button, a, h1-h6, input, label, ul, li, etc.)
  // are rejected before touching the Set.
  const fc = tag.charCodeAt(0);
  const isSVG = (fc === 99 || fc === 100 || fc === 101 || fc === 102 ||   // c,d,e,f
    fc === 103 || fc === 105 || fc === 108 || fc === 109 ||   // g,i,l,m
    fc === 112 || fc === 114 || fc === 115 || fc === 116 ||   // p,r,s,t
    fc === 117) && SVG_TAGS.has(tag);                         // u
  const isCustom = tag.indexOf('-') !== -1;
  const el = acquireElement(tag, isSVG, isCustom);

  if (props) for (const key in props) {
    const val = props[key];
    if (key === "children") continue;
    // Custom attribute controllers (@attribute): `<div sticky intersect={load}>`.
    // Gated on the global flag so unused-feature cost is one boolean per jsx().
    if (hasRegisteredAttributes && isRegisteredAttr(key)) {
      setAttrArg(el, key, val);
      continue;
    }
    if (key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110 && typeof val === "function") {  // 'o','n'
      let eventType = _eventTypeCache[key];
      if (!eventType) { eventType = key.slice(2).toLowerCase(); _eventTypeCache[key] = eventType; }
      // Track for morph diffing
      let events: LoomEventMap | undefined = (el as unknown as LoomNode).__loomEvents;
      if (!events) { events = Object.create(null); (el as unknown as LoomNode).__loomEvents = events!; }
      if (!(eventType in (events as LoomEventMap))) {
        el.addEventListener(eventType, loomEventProxy);
      }
      events![eventType] = val as EventListener;
    } else if (key === "ref" && typeof val === "function") {
      val(el);
    } else if (key === "style" && typeof val === "object") {
      Object.assign((el as HTMLElement).style, val);
    } else if ((key === "className" || key === "class") && typeof val !== "function") {
      if (isSVG) {
        el.setAttribute("class", val as string);
      } else {
        (el as HTMLElement).className = val as string;
      }
    } else if (key === "htmlFor") {
      el.setAttribute("for", val as string);
    } else if (key === "rawHTML" || key === "innerHTML") {
      el.innerHTML = val as string;
      (el as unknown as LoomNode).__loomRawHTML = true;
    } else if (PROP_KEYS.has(key) && typeof val !== "function") {
      // Functions fall through to the closure branch below; applyProp routes
      // the evaluated result back here.
      (el as unknown as Record<string, unknown>)[key] = val;
      // Declare it, so morph patches this property on re-render. Undeclared
      // value/checked/selected/indeterminate belong to the user, not the
      // template, and morph must leave them alone.
      trackProp(el, key, val);
    } else if (typeof val === "boolean") {
      // Enumerated attrs (draggable, contentEditable, spellcheck) need "true"/"false" strings.
      // Empty string means "auto" for these, not "true".
      if (key === "draggable" || key === "contentEditable" || key === "spellcheck") {
        el.setAttribute(key, val ? "true" : "false");
      } else {
        val ? el.setAttribute(key, "") : el.removeAttribute(key);
      }
    } else if (typeof val === "object" || typeof val === "function") {
      // Closure binding — `title={() => this.label}`, `class={() => ...}`.
      //
      // Peeled off INSIDE this branch on purpose: it already tests
      // `typeof val === "function"`, so the common object/property path pays
      // no extra check. A separate branch earlier in the chain would tax every
      // prop of every element of every render.
      //
      // Arity 0 distinguishes a binding from a template function, mirroring
      // the `children.length > 0` rule in appendChildren, so
      // `renderItem={(item) => ...}` stays a JS property. Custom elements are
      // excluded because they legitimately take zero-arg callback props.
      if (typeof val === "function" && (val as Function).length === 0 && !isCustom) {
        startSubTrace();
        try {
          applyProp(el, key, (val as () => unknown)(), isSVG);
          const deps = endSubTrace();
          if (deps.size > 0) {
            addBinding(deps, el, () => applyProp(el, key, (val as () => unknown)(), isSVG));
          }
        } catch (e) {
          console.error(`Loom: Error executing binding for '${key}'`, e);
          endSubTrace(); // Ensure trace stack is popped
        }
      } else {
        // Non-primitive values (arrays, objects, callbacks) — set as JS property
        (el as unknown as Record<string, unknown>)[key] = val;
        // Track for morph diffing (so morph copies them to the existing element)
        let tracked: LoomPropMap | undefined = (el as unknown as LoomNode).__loomProps;
        if (!tracked) { tracked = Object.create(null); (el as unknown as LoomNode).__loomProps = tracked!; }
        tracked![key] = val;
      }
    } else {
      const s = '' + val;
      el.setAttribute(key, s);
      if (key === LOOM_KEY_ATTR) (el as unknown as LoomNode).__loomKey = s;
    }
  }

  // Record which attributes the template declared, so morph knows which ones
  // it is allowed to remove later. Read back off the element rather than
  // tracked at each setAttribute call site: there are eight of those across
  // three branches, and a missed one silently reintroduces exactly the bug
  // this exists to prevent.
  //
  // Only for elements that actually got attributes -- wrappers with none are
  // the common case and allocate nothing.
  // getAttributeNames() hands back a plain array in one call. Walking
  // el.attributes by index goes through the live NamedNodeMap for every entry,
  // which measured ~24% off attribute-heavy element creation.
  if (el.attributes.length > 0) {
    (el as unknown as LoomNode).__loomAttrs = el.getAttributeNames();
  }

  appendChildren(el, props?.children);
  return el;
}

/** jsxs is the same as jsx — we don't do vDOM diffing */
export const jsxs = jsx;

export function Fragment(props: { children?: unknown }): DocumentFragment {
  const frag = document.createDocumentFragment();
  appendChildren(frag, props?.children);
  return frag;
}

function appendChildren(parent: Node, children: unknown): void {
  if (children == null || children === false) return;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) appendChildren(parent, children[i]);
  } else if (children instanceof Node) {
    parent.appendChild(children);
  } else if (typeof children === "function") {
    // Template function for custom elements: {(item) => <div>...</div>}
    // Distinguished from text closures by having declared parameters (fn.length > 0)
    if ((parent as Element).nodeType === 1 &&
      (parent as Element).tagName?.includes('-') &&
      children.length > 0) {
      (parent as unknown as LoomNode).__childTemplate = children as unknown as Node | Node[];
      return;
    }
    // Phase 2: Closure binding for text — {() => this.count}
    const textNode = document.createTextNode("");
    parent.appendChild(textNode);

    startSubTrace();
    try {
      const res = children();
      textNode.textContent = '' + res;
      const deps = endSubTrace();

      if (deps.size > 0) {
        // Create binding with the closure itself as the patcher
        addBinding(deps, textNode, () => {
          textNode.textContent = '' + children();
        });
      }
    } catch (e) {
      console.error("Loom: Error executing text binding", e);
      endSubTrace();
    }
  } else {
    parent.appendChild(document.createTextNode('' + children));
  }
}

/* ── JSX type declarations ─────────────────────────────────── */

type EventHandler<E extends Event = Event> = (event: E) => void;
type MaybeReactive<T> = T | (() => T);
type ClassValue = MaybeReactive<string>;

/**
 * Custom attribute controllers (`@attribute`) — augment this interface to type
 * your directives on every intrinsic element. Empty by default.
 *
 * ```ts
 * declare module "@toyz/loom/jsx-runtime" {
 *   interface LoomCustomAttributes {
 *     sticky?: boolean;
 *     shortcut?: string;
 *     intersect?: () => void;
 *   }
 * }
 *
 * // now type-checks on any element:
 * <div sticky intersect={load} shortcut="j" />
 * ```
 */
export interface LoomCustomAttributes {}

export interface LoomHTMLAttributes extends LoomCustomAttributes {
  id?: string;
  className?: ClassValue;
  class?: ClassValue;
  style?: MaybeReactive<string | Partial<CSSStyleDeclaration>>;
  slot?: string;
  title?: MaybeReactive<string>;
  tabIndex?: MaybeReactive<number>;
  hidden?: MaybeReactive<boolean>;
  draggable?: boolean;
  contentEditable?: boolean | "true" | "false" | "inherit";
  spellcheck?: boolean;
  dir?: "ltr" | "rtl" | "auto";
  lang?: string;
  role?: MaybeReactive<string>;
  accessKey?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  innerHTML?: string;
  rawHTML?: string;
  /**
   * Top-layer attributes. `@popover` drives a `[popover]` element, so writing
   * one in JSX is the normal way to use it -- without these the decorator
   * ships with no way to declare its own target.
   */
  popover?: "auto" | "manual" | "hint" | "" | boolean;
  popoverTarget?: string;
  popoverTargetAction?: "toggle" | "show" | "hide";
  /** Makes a subtree unfocusable and invisible to assistive tech. */
  inert?: MaybeReactive<boolean>;
  /** For <dialog>. Prefer showModal() over setting this by hand. */
  open?: MaybeReactive<boolean>;
  [key: `aria-${string}`]: MaybeReactive<string | number | boolean | undefined>;
  [key: `data-${string}`]: string | number | boolean | undefined;
  ref?: (el: HTMLElement) => void;
  onClick?: EventHandler<MouseEvent>;
  onDblClick?: EventHandler<MouseEvent>;
  onMouseDown?: EventHandler<MouseEvent>;
  onMouseUp?: EventHandler<MouseEvent>;
  onMouseMove?: EventHandler<MouseEvent>;
  onMouseEnter?: EventHandler<MouseEvent>;
  onMouseLeave?: EventHandler<MouseEvent>;
  onMouseOver?: EventHandler<MouseEvent>;
  onMouseOut?: EventHandler<MouseEvent>;
  onContextMenu?: EventHandler<MouseEvent>;
  onWheel?: EventHandler<WheelEvent>;
  onKeyDown?: EventHandler<KeyboardEvent>;
  onKeyUp?: EventHandler<KeyboardEvent>;
  onKeyPress?: EventHandler<KeyboardEvent>;
  onFocus?: EventHandler<FocusEvent>;
  onBlur?: EventHandler<FocusEvent>;
  onInput?: EventHandler<Event>;
  onChange?: EventHandler<Event>;
  onSubmit?: EventHandler<Event>;
  onReset?: EventHandler<Event>;
  onPointerDown?: EventHandler<PointerEvent>;
  onPointerUp?: EventHandler<PointerEvent>;
  onPointerMove?: EventHandler<PointerEvent>;
  onPointerEnter?: EventHandler<PointerEvent>;
  onPointerLeave?: EventHandler<PointerEvent>;
  onPointerCancel?: EventHandler<PointerEvent>;
  onTouchStart?: EventHandler<TouchEvent>;
  onTouchMove?: EventHandler<TouchEvent>;
  onTouchEnd?: EventHandler<TouchEvent>;
  onTouchCancel?: EventHandler<TouchEvent>;
  onDrag?: EventHandler<DragEvent>;
  onDragStart?: EventHandler<DragEvent>;
  onDragEnd?: EventHandler<DragEvent>;
  onDragOver?: EventHandler<DragEvent>;
  onDragEnter?: EventHandler<DragEvent>;
  onDragLeave?: EventHandler<DragEvent>;
  onDrop?: EventHandler<DragEvent>;
  onScroll?: EventHandler<Event>;
  onResize?: EventHandler<Event>;
  onLoad?: EventHandler<Event>;
  onError?: EventHandler<Event>;
  onTransitionEnd?: EventHandler<TransitionEvent>;
  onAnimationEnd?: EventHandler<AnimationEvent>;
  children?: unknown;
}

export interface LoomInputAttributes extends LoomHTMLAttributes {
  type?: string; value?: MaybeReactive<string | number>; placeholder?: MaybeReactive<string>;
  disabled?: MaybeReactive<boolean>; readonly?: MaybeReactive<boolean>; required?: MaybeReactive<boolean>;
  checked?: MaybeReactive<boolean>; min?: MaybeReactive<string | number>; max?: MaybeReactive<string | number>;
  step?: string | number; name?: string; pattern?: string;
  autocomplete?: string; autofocus?: boolean; maxLength?: number; minLength?: number;
  list?: string; accept?: string; multiple?: boolean; size?: number; form?: string;
  capture?: string;
}

export interface LoomTextAreaAttributes extends LoomHTMLAttributes {
  value?: MaybeReactive<string>; placeholder?: MaybeReactive<string>; disabled?: MaybeReactive<boolean>;
  readonly?: MaybeReactive<boolean>; required?: MaybeReactive<boolean>; rows?: number; cols?: number;
  name?: string; maxLength?: number; minLength?: number;
  wrap?: "hard" | "soft" | "off"; autocomplete?: string; form?: string;
}

export interface LoomSelectAttributes extends LoomHTMLAttributes {
  value?: MaybeReactive<string>; disabled?: MaybeReactive<boolean>; required?: MaybeReactive<boolean>; multiple?: boolean; name?: string;
  size?: number; form?: string; autocomplete?: string;
}

export interface LoomOptionAttributes extends LoomHTMLAttributes {
  value?: MaybeReactive<string>; disabled?: MaybeReactive<boolean>; selected?: MaybeReactive<boolean>; label?: string;
}

export interface LoomAnchorAttributes extends LoomHTMLAttributes {
  href?: MaybeReactive<string>; target?: string; rel?: string; download?: string | boolean;
  type?: string; hreflang?: string; referrerPolicy?: string;
}

export interface LoomImageAttributes extends LoomHTMLAttributes {
  src?: MaybeReactive<string>; alt?: MaybeReactive<string>; width?: string | number; height?: string | number;
  loading?: "lazy" | "eager"; crossOrigin?: string;
}

export interface LoomLabelAttributes extends LoomHTMLAttributes { htmlFor?: string; for?: string; }
export interface LoomCanvasAttributes extends LoomHTMLAttributes { width?: string | number; height?: string | number; }
export interface LoomButtonAttributes extends LoomHTMLAttributes {
  type?: "button" | "submit" | "reset"; disabled?: MaybeReactive<boolean>; name?: string; value?: string;
}
export interface LoomFormAttributes extends LoomHTMLAttributes {
  action?: string; method?: string; encType?: string; noValidate?: boolean;
  target?: string; autocomplete?: string; name?: string;
}
export interface LoomVideoAttributes extends LoomHTMLAttributes {
  src?: MaybeReactive<string>; controls?: boolean; autoplay?: boolean; loop?: boolean;
  muted?: MaybeReactive<boolean>; poster?: MaybeReactive<string>; width?: string | number; height?: string | number;
}
export interface LoomAudioAttributes extends LoomHTMLAttributes {
  src?: MaybeReactive<string>; controls?: boolean; autoplay?: boolean; loop?: boolean; muted?: MaybeReactive<boolean>;
}
export interface LoomSourceAttributes extends LoomHTMLAttributes { src?: MaybeReactive<string>; type?: string; media?: string; }
export interface LoomSVGAttributes extends LoomHTMLAttributes {
  viewBox?: string; xmlns?: string; fill?: string; stroke?: string;
  width?: string | number; height?: string | number;
}

export namespace JSX {
  export type Element = HTMLElement | DocumentFragment;

  export interface IntrinsicElements {
    div: LoomHTMLAttributes; span: LoomHTMLAttributes; p: LoomHTMLAttributes;
    main: LoomHTMLAttributes; section: LoomHTMLAttributes; article: LoomHTMLAttributes;
    aside: LoomHTMLAttributes; header: LoomHTMLAttributes; footer: LoomHTMLAttributes;
    nav: LoomHTMLAttributes;
    h1: LoomHTMLAttributes; h2: LoomHTMLAttributes; h3: LoomHTMLAttributes;
    h4: LoomHTMLAttributes; h5: LoomHTMLAttributes; h6: LoomHTMLAttributes;
    strong: LoomHTMLAttributes; em: LoomHTMLAttributes; b: LoomHTMLAttributes;
    i: LoomHTMLAttributes; u: LoomHTMLAttributes; s: LoomHTMLAttributes;
    small: LoomHTMLAttributes; sub: LoomHTMLAttributes; sup: LoomHTMLAttributes;
    mark: LoomHTMLAttributes; code: LoomHTMLAttributes; pre: LoomHTMLAttributes;
    blockquote: LoomHTMLAttributes; abbr: LoomHTMLAttributes; cite: LoomHTMLAttributes;
    q: LoomHTMLAttributes; time: LoomHTMLAttributes; kbd: LoomHTMLAttributes;
    samp: LoomHTMLAttributes; var: LoomHTMLAttributes;
    ul: LoomHTMLAttributes; ol: LoomHTMLAttributes; li: LoomHTMLAttributes;
    dl: LoomHTMLAttributes; dt: LoomHTMLAttributes; dd: LoomHTMLAttributes;
    a: LoomAnchorAttributes; img: LoomImageAttributes; video: LoomVideoAttributes;
    audio: LoomAudioAttributes; source: LoomSourceAttributes; canvas: LoomCanvasAttributes;
    picture: LoomHTMLAttributes; figure: LoomHTMLAttributes; figcaption: LoomHTMLAttributes;
    form: LoomFormAttributes; input: LoomInputAttributes; textarea: LoomTextAreaAttributes;
    select: LoomSelectAttributes; option: LoomOptionAttributes; button: LoomButtonAttributes;
    label: LoomLabelAttributes; fieldset: LoomHTMLAttributes; legend: LoomHTMLAttributes;
    output: LoomHTMLAttributes; progress: LoomHTMLAttributes & { value?: number; max?: number };
    meter: LoomHTMLAttributes & { value?: number; min?: number; max?: number };
    table: LoomHTMLAttributes; thead: LoomHTMLAttributes; tbody: LoomHTMLAttributes;
    tfoot: LoomHTMLAttributes; tr: LoomHTMLAttributes;
    th: LoomHTMLAttributes & { colSpan?: number; rowSpan?: number };
    td: LoomHTMLAttributes & { colSpan?: number; rowSpan?: number };
    caption: LoomHTMLAttributes; colgroup: LoomHTMLAttributes;
    col: LoomHTMLAttributes & { span?: number };
    br: LoomHTMLAttributes; hr: LoomHTMLAttributes;
    details: LoomHTMLAttributes & { open?: MaybeReactive<boolean> }; summary: LoomHTMLAttributes;
    dialog: LoomHTMLAttributes & { open?: MaybeReactive<boolean> }; template: LoomHTMLAttributes;
    slot: LoomHTMLAttributes & { name?: string };
    svg: LoomSVGAttributes; path: LoomSVGAttributes & { d?: string };
    circle: LoomSVGAttributes & { cx?: number; cy?: number; r?: number };
    rect: LoomSVGAttributes & { x?: number; y?: number; width?: number; height?: number; rx?: number; ry?: number };
    line: LoomSVGAttributes & { x1?: number; y1?: number; x2?: number; y2?: number };
    polyline: LoomSVGAttributes & { points?: string };
    polygon: LoomSVGAttributes & { points?: string };
    text: LoomSVGAttributes & { x?: number; y?: number };
    g: LoomSVGAttributes; defs: LoomSVGAttributes;
    use: LoomSVGAttributes & { href?: string };
    [tag: string]: LoomHTMLAttributes & Record<string, any>;
  }
}
