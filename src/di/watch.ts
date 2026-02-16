/**
 * Loom — DI @watch
 *
 * Form 3: Watch a DI-resolved service (or a reactive property on it).
 * Resolves via app.get() at connectedCallback time.
 */

import { app } from "../app";

/**
 * React to changes on a DI-resolved service.
 *
 * Watch the service itself (must extend Reactive):
 * ```ts
 * @watch(TodoStore)
 * onTodos(items: Todo[], prev: Todo[]) { ... }
 * ```
 *
 * Watch a named reactive property on the service:
 * ```ts
 * @watch(ThemeService, "theme")
 * onTheme(value: string, prev: string) { ... }
 * ```
 */
export function watch(service: new (...args: any[]) => any, prop?: string) {
  return (proto: any, key: string) => {
    const orig = proto.connectedCallback;
    proto.connectedCallback = function () {
      orig?.call(this);
      const svc = app.get(service);
      const reactive = prop ? (svc as any)[prop] : svc;
      if (typeof reactive?.subscribe !== "function") {
        throw new Error(
          `[loom] @watch: ${service.name}${prop ? "." + prop : ""} is not a Reactive`,
        );
      }
      const unsub = reactive.subscribe((v: any, p: any) => {
        this[key](v, p);
        this.scheduleUpdate?.();
      });
      this.track(unsub);
    };
  };
}
