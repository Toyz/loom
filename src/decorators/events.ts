import { ON_HANDLERS, WATCHERS, EMITTERS } from "./symbols";
import { LoomEvent } from "../event";
import { bus, type Constructor } from "../bus";

/**
 * Declarative event subscription. Auto-subscribed on connect, auto-cleaned on disconnect.
 *
 * Bus event:
 * ```ts
 * @on(ColorSelect)
 * handleColor(e: ColorSelect) { ... }
 * ```
 *
 * DOM event (window, document, or any EventTarget):
 * ```ts
 * @on(window, "resize")
 * onResize(e: Event) { ... }
 * ```
 */
export function on<T extends LoomEvent>(type: Constructor<T>): (target: any, key: string) => void;
export function on(target: EventTarget, event: string): (target: any, key: string) => void;
export function on(typeOrTarget: any, event?: string) {
  return (target: any, key: string) => {
    if (!target[ON_HANDLERS]) target[ON_HANDLERS] = [];
    if (event !== undefined) {
      // DOM EventTarget binding: @on(window, "resize")
      target[ON_HANDLERS].push({ domTarget: typeOrTarget, event, key });
    } else {
      // Bus event binding: @on(ColorSelect)
      target[ON_HANDLERS].push({ type: typeOrTarget, key });
    }
  };
}

/**
 * React to specific field changes. Receives new and previous values.
 *
 * ```ts
 * @watch("value")
 * onValueChange(newVal: number, oldVal: number) { ... }
 * ```
 */
export function watch(field: string) {
  return (target: any, key: string) => {
    if (!target[WATCHERS]) target[WATCHERS] = [];
    target[WATCHERS].push({ field, key });
  };
}

/**
 * Auto-broadcast to the bus.
 *
 * On a field: fires an event via factory whenever value changes.
 * On a method: return value is auto-emitted (must be LoomEvent subclass).
 *
 * ```ts
 * @reactive @emit(ColorSelect, idx => new ColorSelect(idx, 0))
 * selectedIndex = 0;
 *
 * @emit()
 * placePixel(x: bigint, y: bigint): PixelPlaced {
 *   return new PixelPlaced(x, y, this.selectedColor);
 * }
 * ```
 */
export function emit<T extends LoomEvent>(
  _type?: Constructor<T>,
  factory?: (val: any) => T,
) {
  return (target: any, key: string, desc?: PropertyDescriptor) => {
    if (desc?.value) {
      // Method decorator — wrap, emit return value
      const orig = desc.value;
      desc.value = function (...args: any[]) {
        const result = orig.apply(this, args);
        if (result instanceof LoomEvent) bus.emit(result);
        return result;
      };
    } else {
      // Field decorator — hook into @reactive subscriber
      if (!target[EMITTERS]) target[EMITTERS] = [];
      target[EMITTERS].push({ field: key, factory });
    }
  };
}
