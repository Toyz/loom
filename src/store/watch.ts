/**
 * Loom — Store @watch (TC39 Stage 3)
 *
 * Form 1: Watch a local @reactive field by name
 * Form 2: Watch a direct Reactive/CollectionStore instance
 */

import { WATCHERS, CONNECT_HOOKS } from "../decorators/symbols";

/**
 * Watch a local @reactive field or an external Reactive instance.
 *
 * Form 1 — local field:
 * ```ts
 * @watch("count")
 * onCount(val: number, prev: number) { … }
 * ```
 *
 * Form 2 — external Reactive:
 * ```ts
 * const counter = new Reactive(0);
 * @watch(counter)
 * onCounter(val: number, prev: number) { … }
 * ```
 */
export function watch(field: string): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(store: { subscribe: Function; value: unknown }): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(target: string | { subscribe: Function; value: unknown }) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const key = String(context.name);

    if (typeof target === "string") {
      // Form 1: local @reactive field — store metadata for @reactive to wire
      context.addInitializer(function (this: any) {
        if (!this[WATCHERS]) this[WATCHERS] = [];
        this[WATCHERS].push({ field: target, key });
      });
    } else if (typeof target === "object" && typeof target.subscribe === "function") {
      // Form 2: direct Reactive instance — subscribe on connect via CONNECT_HOOKS
      context.addInitializer(function (this: any) {
        if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
        this[CONNECT_HOOKS].push((el: any) => {
          const unsub = target.subscribe((v: unknown, prev: unknown) => {
            method.call(el, v, prev);
            el.scheduleUpdate?.();
          });
          return unsub;
        });
      });
    }
  };
}
