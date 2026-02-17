/**
 * Loom — Element timing decorators (TC39 Stage 3)
 *
 * @interval       — Auto-cleaned setInterval
 * @timeout        — Auto-cleaned setTimeout
 * @debounce       — Debounced method
 * @throttle       — Throttled method
 * @animationFrame — Centralized rAF loop via RenderLoop
 */

import { renderLoop } from "../render-loop";
import { createDecorator } from "../decorators/create";
import { CONNECT_HOOKS } from "../decorators/symbols";

/**
 * Auto-cleaned setInterval. Runs the method every `ms` milliseconds.
 * Timer is started on connect, cleared on disconnect via track().
 *
 * ```ts
 * @interval(1000)
 * tick() { this.time = new Date(); }
 * ```
 */
export const interval = createDecorator<[ms: number]>((method, _key, ms) => {
  return (el: any) => {
    const id = setInterval(() => method.call(el), ms);
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
export const timeout = createDecorator<[ms: number]>((method, _key, ms) => {
  return (el: any) => {
    const id = setTimeout(() => method.call(el), ms);
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
export function debounce(ms: number) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const timerKey = `__debounce_${String(context.name)}`;

    // Replace with debounced version
    function replacement(this: any, ...args: unknown[]) {
      clearTimeout(this[timerKey]);
      this[timerKey] = setTimeout(() => method.apply(this, args), ms);
    }

    // Lifecycle: cancel pending timer on disconnect
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
      this[CONNECT_HOOKS].push((el: any) => {
        return () => clearTimeout(el[timerKey]);
      });
    });

    return replacement;
  };
}

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
export function throttle(ms: number) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const lastKey = `__throttle_last_${String(context.name)}`;
    const timerKey = `__throttle_timer_${String(context.name)}`;

    // Replace with throttled version
    function replacement(this: any, ...args: unknown[]) {
      const now = Date.now();

      if (!this[lastKey] || now - this[lastKey] >= ms) {
        this[lastKey] = now;
        method.apply(this, args);
      } else {
        clearTimeout(this[timerKey]);
        this[timerKey] = setTimeout(() => {
          this[lastKey] = Date.now();
          method.apply(this, args);
        }, ms - (now - this[lastKey]));
      }
    }

    // Lifecycle: cancel pending timer on disconnect
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
      this[CONNECT_HOOKS].push((el: any) => {
        return () => clearTimeout(el[timerKey]);
      });
    });

    return replacement;
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
 *
 * @animationFrame            // also valid
 * render(dt: number) { ... }
 * ```
 */
export function animationFrame(layer?: number): (method: Function, context: ClassMethodDecoratorContext) => void;
export function animationFrame(method: Function, context: ClassMethodDecoratorContext): void;
export function animationFrame(
  methodOrLayer?: Function | number,
  context?: ClassMethodDecoratorContext,
): void | ((method: Function, context: ClassMethodDecoratorContext) => void) {
  // Called as @animationFrame (no parens) — method is first arg
  if (typeof methodOrLayer === "function" && context) {
    wireAnimationFrame(methodOrLayer, context, 0);
    return;
  }
  // Called as @animationFrame() or @animationFrame(layer)
  const layer = typeof methodOrLayer === "number" ? methodOrLayer : 0;
  return (method: Function, ctx: ClassMethodDecoratorContext) => wireAnimationFrame(method, ctx, layer);
}

/** Internal: wire rAF lifecycle via addInitializer */
function wireAnimationFrame(method: Function, context: ClassMethodDecoratorContext, layer: number): void {
  context.addInitializer(function (this: any) {
    if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
    this[CONNECT_HOOKS].push((el: any) => {
      return renderLoop.add(layer, (dt: number, t: number) => method.call(el, dt, t));
    });
  });
}
