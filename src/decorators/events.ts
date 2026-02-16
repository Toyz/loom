/**
 * Loom — Event decorators
 *
 * @on   — Declarative event subscription (bus events or DOM events)
 * @emit — Auto-broadcast to the bus (field or method form)
 */

import { EMITTERS, ON_HANDLERS } from "./symbols";
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
    // Store metadata for service wiring by app.start()
    if (!target[ON_HANDLERS]) target[ON_HANDLERS] = [];
    if (event !== undefined) {
      target[ON_HANDLERS].push({ key, domTarget: typeOrTarget, event });
    } else {
      target[ON_HANDLERS].push({ key, type: typeOrTarget });
    }

    // Patch connectedCallback for LoomElement self-wiring
    const orig = target.connectedCallback;
    target.connectedCallback = function () {
      orig?.call(this);
      if (event !== undefined) {
        // DOM EventTarget: @on(window, "resize")
        const fn = (e: Event) => (this as any)[key](e);
        typeOrTarget.addEventListener(event, fn);
        this.track(() => typeOrTarget.removeEventListener(event, fn));
      } else {
        // Bus event: @on(ColorSelect)
        this.track(bus.on(typeOrTarget, (e: any) => (this as any)[key](e)));
      }
    };
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
      // Method decorator — wrap, emit return value (define-time)
      const orig = desc.value;
      desc.value = function (...args: any[]) {
        const result = orig.apply(this, args);
        if (result instanceof LoomEvent) bus.emit(result);
        return result;
      };
    } else {
      // Field decorator — store metadata for @reactive subscriber wiring (define-time)
      if (!target[EMITTERS]) target[EMITTERS] = [];
      target[EMITTERS].push({ field: key, factory });
    }
  };
}
