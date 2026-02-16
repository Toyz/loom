/**
 * Loom — JSX Runtime (automatic mode)
 *
 * Zero vDOM. JSX compiles directly to DOM elements.
 * Configure via tsconfig: "jsxImportSource": "loom"
 */

import { LOOM_EVENTS, type LoomEventMap } from "./morph";

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
      if (isSVG) {
        el.setAttribute("class", val);
      } else {
        (el as HTMLElement).className = val;
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
      if (isSVG) {
        el.setAttribute(key, String(val));
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
  } else {
    parent.appendChild(document.createTextNode(String(children)));
  }
}
