import { app } from "../app";
import { CONNECT_HOOKS } from "../decorators/symbols";

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
export function watch(service: new (...args: unknown[]) => unknown, prop?: string) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
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
  };
}
