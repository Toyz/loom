/**
 * Loom — @transition decorator (TC39 Stage 3)
 *
 * Helpers for enter/leave CSS animations on conditional DOM.
 *
 * ```ts
 * @transition({ enter: "fade-in 300ms", leave: "fade-out 200ms" })
 * renderPanel() {
 *   if (!this.showPanel) return null;
 *   return <div class="panel">...</div>;
 * }
 * ```
 */

export interface TransitionOptions {
  /** CSS animation shorthand for enter, e.g. "fade-in 300ms ease-out" */
  enter?: string;
  /** CSS animation shorthand for leave, e.g. "fade-out 200ms ease-in" */
  leave?: string;
  /** CSS class to apply during enter */
  enterClass?: string;
  /** CSS class to apply during leave */
  leaveClass?: string;
}

import { localSymbol } from "../decorators/symbols.js";

/**
 * @transition(opts) — Method decorator
 *
 * Wraps a render method to apply enter/leave animations.
 * When the method returns null/undefined, a leave animation plays
 * before the element is removed.
 */
export function transition(opts: TransitionOptions) {
  return function (method: Function, context: ClassMethodDecoratorContext) {
    // Per-INSTANCE, not per-class. This used to be a `let` in the decorator
    // application closure, which is created once per decorated method — so two
    // components sharing the class clobbered each other's element and the
    // leave animation removed the wrong one's DOM.
    const CURRENT = localSymbol<Element | null>(`transition:${String(context.name)}`);

    return function (this: unknown, ...args: unknown[]) {
      const store = this as unknown as Record<symbol, Element | null>;
      const result = (method as (...a: unknown[]) => unknown).apply(this, args);

      if (result != null) {
        // Entering — apply enter animation
        queueMicrotask(() => {
          const el = result instanceof Node ? result : null;
          if (el && el instanceof HTMLElement) {
            if (opts.enterClass) {
              el.classList.add(opts.enterClass);
              el.addEventListener("animationend", () => {
                el.classList.remove(opts.enterClass!);
              }, { once: true });
            }
            if (opts.enter) {
              el.style.animation = opts.enter;
              el.addEventListener("animationend", () => {
                el.style.animation = "";
              }, { once: true });
            }
            store[CURRENT.key] = el;
          }
        });
        return result;
      }

      // Leaving — play leave animation before removing
      const currentEl = store[CURRENT.key];
      if (currentEl && currentEl instanceof HTMLElement) {
        const el = currentEl;
        store[CURRENT.key] = null;

        if (opts.leaveClass) {
          el.classList.add(opts.leaveClass);
        }
        if (opts.leave) {
          el.style.animation = opts.leave;
        }

        if (opts.leave || opts.leaveClass) {
          const clone = el;
          clone.addEventListener("animationend", () => {
            clone.remove();
          }, { once: true });
          return clone;
        }
      }

      return null;
    };
  };
}
