/**
 * Loom — Unified @watch (TC39 Stage 3)
 *
 * Form 1: Watch a local @reactive field by name
 * Form 2: Watch a direct Reactive/CollectionStore instance
 * Form 3: Watch a DI-resolved service (or a property on it)
 */

import { app } from "../app";
import { WATCHERS, addConnectHook, findLocalStore } from "../decorators/symbols";
import type { Schedulable } from "../element/element";

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
/**
 * Get the observable behind `svc[prop]`.
 *
 * A field declared `@reactive accessor count = 0` reads back as a plain
 * number — the `Reactive` lives on a symbol the accessor closes over. So
 * checking `svc[prop].subscribe` found nothing and threw, which made
 * `@watch(SomeService, "count")` unusable against exactly the services
 * people wanted to watch.
 *
 * The read on the first line is load-bearing: `@reactive` creates its backing
 * store lazily on first access, so a field nobody has read yet has no symbol
 * to find.
 */
function resolveReactive(svc: Record<string, unknown>, prop: string): unknown {
  const direct = svc[prop];
  if (typeof (direct as { subscribe?: Function })?.subscribe === "function") {
    return direct; // already a Reactive instance
  }
  return (
    findLocalStore(svc, `reactive:${prop}`) ??
    findLocalStore(svc, `store:${prop}`) ??
    findLocalStore(svc, `signal:${prop}`) ??
    direct
  );
}

export function watch(field: string): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(store: { subscribe: Function; value: unknown }): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(service: new (...args: unknown[]) => unknown, prop?: string): (method: Function, context: ClassMethodDecoratorContext) => void;
export function watch(target: string | { subscribe: Function; value: unknown } | (new (...args: unknown[]) => unknown), prop?: string) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const key = String(context.name);

    if (typeof target === "string") {
      // Form 1: local @reactive field — store metadata for @reactive to wire
      context.addInitializer(function () {
        const self = this as object;
        const existing = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
        if (!existing) WATCHERS.set(self, [{ field: target, key }]);
        else existing.push({ field: target, key });
      });
    } else if (typeof target === "function") {
      // Form 3: DI-resolved service constructor
      const service = target as new (...args: unknown[]) => unknown;
      context.addInitializer(function () {
        const self = this as object;
        const hook = (el: object) => {
          const svc = app.get(service) as Record<string, unknown>;
          const reactive = prop ? resolveReactive(svc, prop) : svc;
          if (typeof (reactive as { subscribe?: Function })?.subscribe !== "function") {
            throw new Error(
              `[loom] @watch: ${service.name}${prop ? "." + prop : ""} is not reactive. ` +
              `Declare it as \`@reactive accessor ${prop ?? "field"}\`, or as a Reactive instance.`,
            );
          }
          const unsub = (reactive as { subscribe: Function }).subscribe((v: unknown, p: unknown) => {
            method.call(el, v, p);
            (el as unknown as Schedulable).scheduleUpdate?.();
          });
          return unsub;
        };
        addConnectHook(self, hook);
      });
    } else if (typeof target === "object" && typeof target.subscribe === "function") {
      // Form 2: direct Reactive instance — subscribe on connect via CONNECT_HOOKS
      context.addInitializer(function () {
        const self = this as object;
        const hook = (el: object) => {
          const unsub = target.subscribe((v: unknown, prev: unknown) => {
            method.call(el, v, prev);
            (el as unknown as Schedulable).scheduleUpdate?.();
          });
          return unsub;
        };
        addConnectHook(self, hook);
      });
    }
  };
}
