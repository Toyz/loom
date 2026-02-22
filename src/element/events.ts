/**
 * Loom — @event<T> decorator
 *
 * Marks an auto-accessor as an event callback prop.
 * When assigned, stores the callback AND dispatches a composed
 * CustomEvent so external listeners work across shadow DOM.
 *
 * ```ts
 * @event<DrawCallback>() accessor draw: DrawCallback | null;
 *
 * // Invoke in your render loop:
 * this.draw?.(ctx, dt, t);
 * ```
 *
 * Consumers use it naturally in JSX:
 * ```tsx
 * <loom-canvas draw={(ctx, dt, t) => { ... }} />
 * ```
 *
 * External listeners also work:
 * ```ts
 * el.addEventListener("draw", (e: CustomEvent) => ...);
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

/**
 * Decorator for typed event callback props.
 *
 * - Stores the callback as a JS property (JSX sets it via property assignment)
 * - Dispatches a composed CustomEvent on invocation for cross-shadow-DOM listening
 */
export function event<T extends (...args: any[]) => void>() {
  return <This extends HTMLElement>(
    _target: ClassAccessorDecoratorTarget<This, T | null>,
    context: ClassAccessorDecoratorContext<This, T | null>,
  ): ClassAccessorDecoratorResult<This, T | null> => {
    const eventName = String(context.name);
    const storageKey = Symbol(`event:${eventName}`);

    return {
      init() {
        return null;
      },
      get(this: This) {
        return (this as any)[storageKey] ?? null;
      },
      set(this: This, value: T | null) {
        (this as any)[storageKey] = value;
      },
    };
  };
}
