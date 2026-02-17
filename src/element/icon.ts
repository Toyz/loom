/**
 * Loom — Icon Component
 *
 * Reusable SVG icon wrapper with a static registry.
 * Ships with zero built-in icons — register your own.
 *
 * Usage:
 *   // Register icons (once, at boot)
 *   LoomIcon.register("bolt", '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />');
 *
 *   // Use anywhere in JSX
 *   <loom-icon name="bolt" size={20} color="var(--accent)" />
 */

import { LoomElement } from "./element";
import { component } from "./decorators";
import { prop } from "../store/decorators";
import { css } from "../css";

const baseStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    line-height: 0;
    width: var(--_s);
    height: var(--_s);
  }
  svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: var(--_c, currentColor);
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

/** Icon path data registry (name → SVG inner content) */
const registry = new Map<string, string>();

@component("loom-icon")
export class LoomIcon extends LoomElement {

  /** Icon name (must be registered via LoomIcon.register) */
  @prop accessor name = "";

  /** Size in pixels */
  @prop accessor size = 24;

  /** Stroke color (CSS value) */
  @prop accessor color = "currentColor";

  /** Register an icon. `svgInner` is the SVG inner content (paths, circles, etc). */
  static register(name: string, svgInner: string): void {
    registry.set(name, svgInner);
  }

  /** Register multiple icons at once. */
  static registerAll(icons: Record<string, string>): void {
    for (const [name, svg] of Object.entries(icons)) {
      registry.set(name, svg);
    }
  }

  /** Check if an icon is registered. */
  static has(name: string): boolean {
    return registry.has(name);
  }

  /** List all registered icon names. */
  static get names(): string[] {
    return Array.from(registry.keys());
  }

  /** Immediately apply size/color from attributes — runs before connectedCallback */
  attributeChangedCallback(name: string, _old: string | null, val: string | null) {
    // Note: @component decorator wraps this method and parses @prop values
    // before calling us. We just sync the CSS custom properties immediately.
    if (name === "size" && val !== null) {
      this.style.setProperty("--_s", `${val}px`);
    } else if (name === "color" && val !== null) {
      this.style.setProperty("--_c", val);
    }
  }

  connectedCallback() {
    // Set CSS vars from current attributes before first paint
    const s = this.getAttribute("size");
    const c = this.getAttribute("color");
    this.style.setProperty("--_s", `${s ?? this.size}px`);
    if (c) this.style.setProperty("--_c", c);
    super.connectedCallback();
  }

  update() {
    this.shadow.adoptedStyleSheets = [baseStyles];
    this.style.setProperty("--_s", `${this.size}px`);
    this.style.setProperty("--_c", this.color);

    const inner = registry.get(this.name);
    if (!inner) {
      const placeholder = document.createElement("span");
      return placeholder;
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = inner;
    return svg;
  }
}
