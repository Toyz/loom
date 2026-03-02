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
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];
      this[CONNECT_HOOKS.key].push((el: any) => {
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
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];
      this[CONNECT_HOOKS.key].push((el: any) => {
        return () => clearTimeout(el[timerKey]);
      });
    });

    return replacement;
  };
}

/**
 * Centralized rAF loop via RenderLoop. Method receives (deltaTime, timestamp).
 * Use layer to control execution order (lower = earlier).
 * Use fps to cap the callback rate (default: uncapped, runs every frame).
 *
 * ```ts
 * @animationFrame(10)                        // layer 10, every frame
 * draw(dt: number, t: number) { ... }
 *
 * @animationFrame({ fps: 30 })               // 30fps, layer 0
 * particles(dt: number, t: number) { ... }
 *
 * @animationFrame({ fps: 24, layer: 5 })     // 24fps, layer 5
 * ambient(dt: number, t: number) { ... }
 *
 * @animationFrame                             // also valid (layer 0, every frame)
 * render(dt: number) { ... }
 * ```
 */

export interface AnimationFrameOptions {
  /** Execution layer — lower layers run first (default: 0) */
  layer?: number;
  /** Target frames per second — caps callback rate (default: uncapped) */
  fps?: number;
}

const _af = createDecorator<[layer: number, fps: number | undefined]>((method, _key, layer, fps) => {
  return (el: HTMLElement) => {
    if (fps && fps > 0 && fps < 60) {
      const budget = 1 / fps;
      let acc = 0;
      return renderLoop.add(layer, (dt: number, t: number) => {
        acc += dt;
        if (acc >= budget) {
          acc -= budget;
          method.call(el, dt, t);
        }
      });
    }
    return renderLoop.add(layer, (dt: number, t: number) => method.call(el, dt, t));
  };
});

export function animationFrame(opts: AnimationFrameOptions): (method: Function, context: ClassMethodDecoratorContext) => void;
export function animationFrame(layer?: number): (method: Function, context: ClassMethodDecoratorContext) => void;
export function animationFrame(method: Function, context: ClassMethodDecoratorContext): void;
export function animationFrame(
  methodOrLayerOrOpts?: Function | number | AnimationFrameOptions,
  context?: ClassMethodDecoratorContext,
): void | ((method: Function, context: ClassMethodDecoratorContext) => void) {
  // Called as @animationFrame (no parens) — method is first arg
  if (typeof methodOrLayerOrOpts === "function" && context) {
    _af(0, undefined)(methodOrLayerOrOpts, context);
    return;
  }
  // Called as @animationFrame({ fps: 30, layer: 5 })
  if (typeof methodOrLayerOrOpts === "object" && methodOrLayerOrOpts !== null) {
    const opts = methodOrLayerOrOpts as AnimationFrameOptions;
    return _af(opts.layer ?? 0, opts.fps);
  }
  // Called as @animationFrame() or @animationFrame(layer)
  const layer = typeof methodOrLayerOrOpts === "number" ? methodOrLayerOrOpts : 0;
  return _af(layer, undefined);
}
