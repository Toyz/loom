/**
 * Loom — Store @watch
 *
 * Form 1: Watch a local @reactive field by name
 * Form 2: Watch a direct Reactive/CollectionStore instance
 */

import { WATCHERS } from "../decorators/symbols";

/**
 * React to local @reactive field changes or direct store changes.
 *
 * Local @reactive field — stores metadata consumed by @reactive's subscriber wiring:
 * ```ts
 * @watch("value")
 * onValueChange(curr: number, prev: number) { ... }
 * ```
 *
 * Direct Reactive/CollectionStore instance — subscribes on connect, cleans up on disconnect:
 * ```ts
 * @watch(todos)
 * onTodosChange(items: Todo[], prev: Todo[]) { ... }
 * ```
 */
export function watch(field: string): (target: any, key: string) => void;
export function watch(store: { subscribe: Function; value: any }): (target: any, key: string) => void;
export function watch(target: string | { subscribe: Function; value: any }) {
  return (proto: any, key: string) => {
    if (typeof target === "string") {
      // Form 1: local @reactive field — store metadata for @reactive to wire
      if (!proto[WATCHERS]) proto[WATCHERS] = [];
      proto[WATCHERS].push({ field: target, key });
    } else if (typeof target === "object" && typeof target.subscribe === "function") {
      // Form 2: direct Reactive instance — subscribe on connect
      const orig = proto.connectedCallback;
      proto.connectedCallback = function () {
        orig?.call(this);
        const unsub = target.subscribe((v: any, p: any) => {
          this[key](v, p);
          this.scheduleUpdate?.();
        });
        this.track(unsub);
      };
    }
  };
}
