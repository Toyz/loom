import { CONNECT_HOOKS } from "../decorators/symbols";
import type { Schedulable } from "./element";
/**
 * Loom — @slot<...T> decorator (TC39 Stage 3)
 *
 * Auto-accessor decorator that provides typed access to slot-assigned elements.
 *
 * ```ts
 * // Default slot
 * @slot()
 * accessor content!: Element[];
 *
 * // Typed single
 * @slot<CardHeader>("header")
 * accessor headers!: CardHeader[];
 *
 * // Spread — heterogeneous
 * @slot<CardHeader, CardBody, CardFooter>("content")
 * accessor sections!: (CardHeader | CardBody | CardFooter)[];
 * ```
 */

export function slot<T extends Element[] = [Element]>(name?: string) {
  return <This extends { shadow: ShadowRoot }>(
    _target: ClassAccessorDecoratorTarget<This, T[number][]>,
    context: ClassAccessorDecoratorContext<This, T[number][]>,
  ): ClassAccessorDecoratorResult<This, T[number][]> => {
    const storageKey = Symbol(`slot:${String(context.name)}`);

    context.addInitializer(function () {
      const self = this as object;
      const hooks = CONNECT_HOOKS.from(self) as Array<(el: object) => (() => void) | void> | undefined;
      const hook = (el: object) => {
        const host = el as Schedulable & { shadow: ShadowRoot; track: (fn: () => void) => void } & Record<symbol, unknown>;
        // Defer to allow update() to render the slot elements first
        queueMicrotask(() => {
          const selector = name ? `slot[name="${name}"]` : "slot:not([name])";
          const slotEl = host.shadow.querySelector(selector) as HTMLSlotElement | null;

          if (!slotEl) return;

          const updateSlotted = () => {
            host[storageKey] = slotEl.assignedElements({ flatten: true });
            host.scheduleUpdate?.();
          };

          updateSlotted();

          slotEl.addEventListener("slotchange", updateSlotted);
          host.track(() => slotEl.removeEventListener("slotchange", updateSlotted));
        });
      };
      if (!hooks) CONNECT_HOOKS.set(self, [hook]);
      else hooks.push(hook);
    });

    return {
      get(this: This): T[number][] {
        return (this as unknown as Record<symbol, unknown>)[storageKey] as T[number][] ?? [];
      },
      set(this: This, val: T[number][]) {
        (this as unknown as Record<symbol, unknown>)[storageKey] = val;
      },
    };
  };
}
