import { CONNECT_HOOKS } from "../decorators/symbols";
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

    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];
      this[CONNECT_HOOKS.key].push((el: any) => {
        // Defer to allow update() to render the slot elements first
        queueMicrotask(() => {
          const selector = name ? `slot[name="${name}"]` : "slot:not([name])";
          const slotEl = el.shadow.querySelector(selector) as HTMLSlotElement | null;

          if (!slotEl) return;

          const updateSlotted = () => {
            el[storageKey] = slotEl.assignedElements({ flatten: true });
            el.scheduleUpdate?.();
          };

          updateSlotted();

          slotEl.addEventListener("slotchange", updateSlotted);
          el.track(() => slotEl.removeEventListener("slotchange", updateSlotted));
        });
      });
    });

    return {
      get(this: any): T[number][] {
        return this[storageKey] ?? [];
      },
      set(this: any, val: T[number][]) {
        this[storageKey] = val;
      },
    };
  };
}
