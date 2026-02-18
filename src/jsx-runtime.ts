/**
 * Loom — JSX Runtime (automatic mode)
 *
 * Zero vDOM. JSX compiles directly to DOM elements.
 * Configure via tsconfig: "jsxImportSource": "loom"
 */

import { LOOM_EVENTS, type LoomEventMap } from "./morph";
import { startSubTrace, endSubTrace, addBinding } from "./trace";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg", "path", "circle", "rect", "line", "polyline", "polygon",
  "text", "g", "defs", "use", "clipPath", "mask", "filter",
  "linearGradient", "radialGradient", "stop", "foreignObject",
  "marker", "symbol", "pattern", "ellipse", "image", "tspan",
]);

/** Properties that must be set as JS properties, not HTML attributes */
const PROP_KEYS = new Set(["value", "checked", "selected", "indeterminate"]);

export function jsx(
  tag: string | Function,
  props: Record<string, any>,
): HTMLElement | SVGElement | DocumentFragment {
  if (typeof tag === "function") return tag(props);

  const isSVG = SVG_TAGS.has(tag);
  const el = isSVG
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);

  for (const [key, val] of Object.entries(props ?? {})) {
    if (key === "children") continue;
    if (key.startsWith("on") && typeof val === "function") {
      const eventType = key.slice(2).toLowerCase();
      el.addEventListener(eventType, val);
      // Track for morph diffing
      let events: LoomEventMap = (el as any)[LOOM_EVENTS];
      if (!events) { events = new Map(); (el as any)[LOOM_EVENTS] = events; }
      events.set(eventType, val);
    } else if (key === "ref" && typeof val === "function") {
      val(el);
    } else if (key === "style" && typeof val === "object") {
      Object.assign((el as HTMLElement).style, val);
    } else if (key === "className" || key === "class") {
      if (typeof val === "function") {
        // Closure binding for class
        startSubTrace();
        try {
          const res = val();
          if (isSVG) el.setAttribute("class", String(res));
          else (el as HTMLElement).className = String(res);

          const deps = endSubTrace();
          if (deps.size > 0) {
            addBinding(deps, el, () => {
              const v = val();
              if (isSVG) el.setAttribute("class", String(v));
              else (el as HTMLElement).className = String(v);
            });
          }
        } catch (e) {
          console.error("Loom: Error executing class binding", e);
          endSubTrace();
        }
      } else {
        if (isSVG) {
          el.setAttribute("class", val);
        } else {
          (el as HTMLElement).className = val;
        }
      }
    } else if (key === "htmlFor") {
      el.setAttribute("for", val);
    } else if (key === "rawHTML" || key === "innerHTML") {
      el.innerHTML = val;
      (el as any).__loomRawHTML = true;
    } else if (PROP_KEYS.has(key)) {
      (el as any)[key] = val;
    } else if (typeof val === "boolean") {
      val ? el.setAttribute(key, "") : el.removeAttribute(key);
    } else if (typeof val === "object" || typeof val === "function") {
      // Non-primitive values (arrays, objects) — set as JS property
      (el as any)[key] = val;
    } else {
      // Check for closure binding: class={() => this.theme}
      if (typeof val === "function") {
        startSubTrace();
        try {
          const res = val();
          el.setAttribute(key, String(res));
          const deps = endSubTrace();
          if (deps.size > 0) {
            addBinding(deps, el, () => el.setAttribute(key, String(val())));
          }
        } catch (e) {
          // Fallback or error handling for failed binding execution
          console.error(`Loom: Error executing binding for attribute '${key}'`, e);
          el.setAttribute(key, "");
          endSubTrace(); // Ensure trace stack is popped
        }
      } else {
        el.setAttribute(key, String(val));
      }
    }
  }

  appendChildren(el, props?.children);
  return el;
}

/** jsxs is the same as jsx — we don't do vDOM diffing */
export const jsxs = jsx;

export function Fragment(props: { children?: any }): DocumentFragment {
  const frag = document.createDocumentFragment();
  appendChildren(frag, props?.children);
  return frag;
}

function appendChildren(parent: Node, children: any): void {
  if (children == null || children === false) return;
  if (Array.isArray(children)) {
    children.forEach((c) => appendChildren(parent, c));
  } else if (children instanceof Node) {
    parent.appendChild(children);
  } else if (typeof children === "function") {
    // Phase 2: Closure binding for text — {() => this.count}
    const textNode = document.createTextNode("");
    parent.appendChild(textNode);

    startSubTrace();
    try {
      const res = children();
      textNode.textContent = String(res);
      const deps = endSubTrace();

      if (deps.size > 0) {
        // Create binding with the closure itself as the patcher
        addBinding(deps, textNode, () => {
          textNode.textContent = String(children());
        });
      }
    } catch (e) {
      console.error("Loom: Error executing text binding", e);
      endSubTrace();
    }
  } else {
    parent.appendChild(document.createTextNode(String(children)));
  }
}

/* ── JSX type declarations ─────────────────────────────────── */

type EventHandler<E extends Event = Event> = (event: E) => void;

export interface LoomHTMLAttributes {
  id?: string;
  className?: string;
  class?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  slot?: string;
  title?: string;
  tabIndex?: number;
  hidden?: boolean;
  draggable?: boolean;
  innerHTML?: string;
  rawHTML?: string;
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
  children?: any;
}

export interface LoomInputAttributes extends LoomHTMLAttributes {
  type?: string; value?: string | number; placeholder?: string;
  disabled?: boolean; readonly?: boolean; required?: boolean;
  checked?: boolean; min?: string | number; max?: string | number;
  step?: string | number; name?: string; pattern?: string;
  autocomplete?: string; autofocus?: boolean; maxLength?: number; minLength?: number;
}

export interface LoomTextAreaAttributes extends LoomHTMLAttributes {
  value?: string; placeholder?: string; disabled?: boolean;
  readonly?: boolean; required?: boolean; rows?: number; cols?: number;
  name?: string; maxLength?: number; minLength?: number;
}

export interface LoomSelectAttributes extends LoomHTMLAttributes {
  value?: string; disabled?: boolean; required?: boolean; multiple?: boolean; name?: string;
}

export interface LoomOptionAttributes extends LoomHTMLAttributes {
  value?: string; disabled?: boolean; selected?: boolean; label?: string;
}

export interface LoomAnchorAttributes extends LoomHTMLAttributes {
  href?: string; target?: string; rel?: string; download?: string | boolean;
}

export interface LoomImageAttributes extends LoomHTMLAttributes {
  src?: string; alt?: string; width?: string | number; height?: string | number;
  loading?: "lazy" | "eager"; crossOrigin?: string;
}

export interface LoomLabelAttributes extends LoomHTMLAttributes { htmlFor?: string; }
export interface LoomCanvasAttributes extends LoomHTMLAttributes { width?: string | number; height?: string | number; }
export interface LoomButtonAttributes extends LoomHTMLAttributes {
  type?: "button" | "submit" | "reset"; disabled?: boolean; name?: string; value?: string;
}
export interface LoomFormAttributes extends LoomHTMLAttributes {
  action?: string; method?: string; encType?: string; noValidate?: boolean;
}
export interface LoomVideoAttributes extends LoomHTMLAttributes {
  src?: string; controls?: boolean; autoplay?: boolean; loop?: boolean;
  muted?: boolean; poster?: string; width?: string | number; height?: string | number;
}
export interface LoomAudioAttributes extends LoomHTMLAttributes {
  src?: string; controls?: boolean; autoplay?: boolean; loop?: boolean; muted?: boolean;
}
export interface LoomSourceAttributes extends LoomHTMLAttributes { src?: string; type?: string; media?: string; }
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
    details: LoomHTMLAttributes & { open?: boolean }; summary: LoomHTMLAttributes;
    dialog: LoomHTMLAttributes & { open?: boolean }; template: LoomHTMLAttributes;
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
