/**
 * Loom — Icon Component
 *
 * Reusable SVG icon wrapper with a static registry and optional DI resolver.
 *
 * Usage:
 *   // Register icons (once, at boot)
 *   LoomIcon.register("bolt", '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />');
 *
 *   // Use anywhere in JSX
 *   <loom-icon name="bolt" size={20} color="var(--accent)" />
 *
 *   // Optional: plug in an icon pack via DI
 *   app.use(IconResolver, myHeroIconResolver);
 */

import { LoomElement } from "./element";
import { component, styles } from "./decorators";
import { prop } from "../store/decorators";
import { watch } from "../store/watch";
import { css } from "../css";
import { app } from "../app";

const baseStyles = css`
  loom-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    line-height: 0;
    width: var(--_s);
    height: var(--_s);
  }
  loom-icon svg {
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

/**
 * Abstract resolver for external icon packs.
 * Register via `app.use(IconResolver, myResolver)`.
 *
 * ```ts
 * class HeroIconResolver extends IconResolver {
 *   resolve(name: string) {
 *     return heroicons[name] ?? null;
 *   }
 * }
 * app.use(IconResolver, new HeroIconResolver());
 * ```
 */
export abstract class IconResolver {
  /** Return SVG inner content for `name`, or `null` to fall back to static registry. */
  abstract resolve(name: string): string | null;
}

@component("loom-icon", { shadow: false })
@styles(baseStyles)
export class LoomIcon extends LoomElement {

  /** Icon name (must be registered via LoomIcon.register or resolved via IconResolver) */
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

  @watch("size")
  @watch("color")
  private syncVars() {
    this.style.setProperty("--_s", `${this.size}px`);
    this.style.setProperty("--_c", this.color);
  }

  update() {
    this.style.setProperty("--_s", `${this.size}px`);
    this.style.setProperty("--_c", this.color);

    // Resolver first → static registry fallback
    const resolver = app.maybe<IconResolver>(IconResolver);
    const inner = (resolver.ok ? resolver.unwrap().resolve(this.name) : null)
      ?? registry.get(this.name);

    if (!inner) return document.createElement("span");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = inner;
    return svg;
  }
}
