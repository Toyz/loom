import { renderLoop } from "../render-loop";

/**
 * Auto-cleaned setInterval. Runs the method every `ms` milliseconds.
 * Timer is started on connect, cleared on disconnect via track().
 *
 * ```ts
 * @interval(1000)
 * tick() { this.time = new Date(); }
 * ```
 */
export function interval(ms: number) {
  return (target: any, key: string) => {
    const origConnect = target.connectedCallback;
    target.connectedCallback = function () {
      origConnect?.call(this);
      const id = setInterval(() => this[key](), ms);
      this.track(() => clearInterval(id));
    };
  };
}

/**
 * Auto-cleaned setTimeout. Runs the method once after `ms` milliseconds.
 * Timer is started on connect, cleared on disconnect via track().
 *
 * ```ts
 * @timeout(3000)
 * hideWelcome() { this.$(".welcome")?.remove(); }
 * ```
 */
export function timeout(ms: number) {
  return (target: any, key: string) => {
    const origConnect = target.connectedCallback;
    target.connectedCallback = function () {
      origConnect?.call(this);
      const id = setTimeout(() => this[key](), ms);
      this.track(() => clearTimeout(id));
    };
  };
}

/**
 * Centralized rAF loop via RenderLoop. Method receives (deltaTime, timestamp).
 * Use layer to control execution order (lower = earlier).
 *
 * ```ts
 * @animationFrame(10)       // layer 10
 * draw(dt: number, t: number) { ... }
 *
 * @animationFrame()          // default layer 0
 * physics(dt: number) { ... }
 * ```
 */
export function animationFrame(layer?: number): (target: any, key: string) => void;
export function animationFrame(target: any, key: string): void;
export function animationFrame(
  targetOrLayer?: any,
  key?: string,
): void | ((target: any, key: string) => void) {
  // Called as @animationFrame (no parens)
  if (typeof targetOrLayer === "object" && typeof key === "string") {
    wireAnimationFrame(targetOrLayer, key, 0);
    return;
  }
  // Called as @animationFrame() or @animationFrame(layer)
  const layer = typeof targetOrLayer === "number" ? targetOrLayer : 0;
  return (target: any, key: string) => wireAnimationFrame(target, key, layer);
}

function wireAnimationFrame(target: any, key: string, layer: number): void {
  const origConnect = target.connectedCallback;
  target.connectedCallback = function () {
    origConnect?.call(this);
    this.track(renderLoop.add(layer, (dt: number, t: number) => this[key](dt, t)));
  };
}
