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
 * NOTE: this is a callback PROP, not a DOM event. No CustomEvent is
 * dispatched, so `el.addEventListener("draw", ...)` will not fire — read or
 * call the property instead. Wrapping the getter to also dispatch would make
 * it always truthy and break the common `if (this.draw)` guard, so cross-shadow
 * dispatch would need to be an explicit opt-in rather than silent behavior.
 */

import { localSymbol } from "../decorators/symbols";

/**
 * Decorator for typed event callback props.
 *
 * Stores the callback as a JS property, which is how JSX assigns it.
 */
export function event<T extends (...args: any[]) => void>() {
  return <This extends HTMLElement>(
    _target: ClassAccessorDecoratorTarget<This, T | null>,
    context: ClassAccessorDecoratorContext<This, T | null>,
  ): ClassAccessorDecoratorResult<This, T | null> => {
    const eventName = String(context.name);
    const storage = localSymbol<T | null>(`event:${eventName}`);

    return {
      init() {
        return null;
      },
      get(this: This) {
        return (this as any)[storage.key] ?? null;
      },
      set(this: This, value: T | null) {
        (this as any)[storage.key] = value;
      },
    };
  };
}
