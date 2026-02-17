/**
 * Loom — Unified @watch (TC39 Stage 3)
 *
 * Form 1: Watch a local @reactive field by name
 * Form 2: Watch a direct Reactive/CollectionStore instance
 * Form 3: Watch a DI-resolved service (or a property on it)
 */

import { app } from "../app";
import { WATCHERS, CONNECT_HOOKS } from "../decorators/symbols";

/**
 * Watch a local @reactive field, an external Reactive instance,
 * or a DI-resolved service.
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
 *
 * Form 3 — DI-resolved service:
 * ```ts
 * @watch(TodoStore)
 * onTodos(items: Todo[], prev: Todo[]) { … }
 *
 * @watch(ThemeService, "theme")
 * onTheme(val: string, prev: string) { … }
 * ```
 */
export function watch(field: string): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(store: { subscribe: Function; value: unknown }): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(service: new (...args: unknown[]) => unknown, prop?: string): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(target: string | { subscribe: Function; value: unknown } | (new (...args: unknown[]) => unknown), prop?: string) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const key = String(context.name);

    if (typeof target === "string") {
      // Form 1: local @reactive field — store metadata for @reactive to wire
      context.addInitializer(function (this: any) {
        if (!this[WATCHERS]) this[WATCHERS] = [];
        this[WATCHERS].push({ field: target, key });
      });
    } else if (typeof target === "function") {
      // Form 3: DI-resolved service constructor
      const service = target as new (...args: unknown[]) => unknown;
      context.addInitializer(function (this: any) {
        if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
        this[CONNECT_HOOKS].push((el: any) => {
          const svc = app.get(service);
          const reactive = prop ? (svc as Record<string, unknown>)[prop] : svc;
          if (typeof (reactive as { subscribe?: Function })?.subscribe !== "function") {
            throw new Error(
              `[loom] @watch: ${service.name}${prop ? "." + prop : ""} is not a Reactive`,
            );
          }
          const unsub = (reactive as { subscribe: Function }).subscribe((v: unknown, p: unknown) => {
            method.call(el, v, p);
            el.scheduleUpdate?.();
          });
          return unsub;
        });
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
