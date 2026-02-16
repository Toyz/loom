/**
 * Loom — Element timing decorators
 *
 * @interval       — Auto-cleaned setInterval
 * @timeout        — Auto-cleaned setTimeout
 * @debounce       — Debounced method
 * @throttle       — Throttled method
 * @animationFrame — Centralized rAF loop via RenderLoop
 */

import { renderLoop } from "../render-loop";
import { createDecorator } from "../decorators/create";

/**
 * Auto-cleaned setInterval. Runs the method every `ms` milliseconds.
 * Timer is started on connect, cleared on disconnect via track().
 *
 * ```ts
 * @interval(1000)
 * tick() { this.time = new Date(); }
 * ```
 */
export const interval = createDecorator<[ms: number]>((_proto, key, ms) => {
  return (el: any) => {
    const id = setInterval(() => el[key](), ms);
    return () => clearInterval(id);
  };
});

/**
 * Auto-cleaned setTimeout. Runs the method once after `ms` milliseconds.
 * Timer is started on connect, cleared on disconnect via track().
 *
 * ```ts
 * @timeout(3000)
 * hideWelcome() { this.$(".welcome")?.remove(); }
 * ```
 */
export const timeout = createDecorator<[ms: number]>((_proto, key, ms) => {
  return (el: any) => {
    const id = setTimeout(() => el[key](), ms);
    return () => clearTimeout(id);
  };
});

/**
 * Debounce a method — delays execution until `ms` of inactivity.
 * Auto-cancels pending timer on disconnect.
 *
 * ```ts
 * @debounce(300)
 * onInput(e: Event) { this.query = (e.target as HTMLInputElement).value; }
 * ```
 */
export const debounce = createDecorator<[ms: number]>((proto, key, ms) => {
  const original = proto[key];
  const timerKey = `__debounce_${key}`;

  // Define-time: replace method with debounced version
  proto[key] = function (this: any, ...args: any[]) {
    clearTimeout(this[timerKey]);
    this[timerKey] = setTimeout(() => original.apply(this, args), ms);
  };

  // Lifecycle: cancel pending timer on disconnect
  return (el: any) => {
    return () => clearTimeout(el[timerKey]);
  };
});

/**
 * Throttle a method — fires at most once per `ms` milliseconds.
 * Uses trailing-edge: the last call within the window always fires.
 * Auto-cancels pending timer on disconnect.
 *
 * ```ts
 * @throttle(16)
 * onScroll() { this.offset = this.scrollTop; }
 * ```
 */
export const throttle = createDecorator<[ms: number]>((proto, key, ms) => {
  const original = proto[key];
  const lastKey = `__throttle_last_${key}`;
  const timerKey = `__throttle_timer_${key}`;

  // Define-time: replace method with throttled version
  proto[key] = function (this: any, ...args: any[]) {
    const now = Date.now();

    if (!this[lastKey] || now - this[lastKey] >= ms) {
      this[lastKey] = now;
      original.apply(this, args);
    } else {
      clearTimeout(this[timerKey]);
      this[timerKey] = setTimeout(() => {
        this[lastKey] = Date.now();
        original.apply(this, args);
      }, ms - (now - this[lastKey]));
    }
  };

  // Lifecycle: cancel pending timer on disconnect
  return (el: any) => {
    return () => clearTimeout(el[timerKey]);
  };
});

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

/** Internal: uses createDecorator pattern manually for overload support */
function wireAnimationFrame(target: any, key: string, layer: number): void {
  const orig = target.connectedCallback;
  target.connectedCallback = function () {
    orig?.call(this);
    this.track(renderLoop.add(layer, (dt: number, t: number) => this[key](dt, t)));
  };
}
