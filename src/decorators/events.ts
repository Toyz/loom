/**
 * Loom — Event decorators (TC39 Stage 3)
 *
 * @on   — Declarative event subscription (bus events or DOM events)
 * @emit — Auto-broadcast to the bus (field or method form)
 */

import { EMITTERS, ON_HANDLERS, CONNECT_HOOKS } from "./symbols";
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
export function on<T extends LoomEvent>(type: Constructor<T>): (method: Function, context: ClassMethodDecoratorContext) => void;
export function on(target: EventTarget, event: string): (method: Function, context: ClassMethodDecoratorContext) => void;
export function on(typeOrTarget: Constructor<LoomEvent> | EventTarget, event?: string) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const key = String(context.name);

    context.addInitializer(function (this: any) {
      // Store metadata for service wiring by app.start()
      if (!this[ON_HANDLERS]) this[ON_HANDLERS] = [];
      if (event !== undefined) {
        this[ON_HANDLERS].push({ key, domTarget: typeOrTarget, event });
      } else {
        this[ON_HANDLERS].push({ key, type: typeOrTarget });
      }

      // Wire lifecycle via CONNECT_HOOKS
      if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
      this[CONNECT_HOOKS].push((el: any) => {
        if (event !== undefined) {
          const fn = (e: Event) => method.call(el, e);
          (typeOrTarget as EventTarget).addEventListener(event!, fn);
          return () => (typeOrTarget as EventTarget).removeEventListener(event!, fn);
        } else {
          return bus.on(typeOrTarget as Constructor<LoomEvent>, (e: LoomEvent) => method.call(el, e));
        }
      });
    });
  };
}

/**
 * Auto-broadcast to the bus.
 *
 * On a method: return value is auto-emitted (must be LoomEvent subclass).
 *
 * On a field (with @reactive): fires event via factory whenever value changes.
 * Field form stores metadata consumed by @reactive's subscriber wiring.
 *
 * ```ts
 * @emit()
 * placePixel(x: bigint, y: bigint): PixelPlaced {
 *   return new PixelPlaced(x, y, this.selectedColor);
 * }
 *
 * @reactive @emit(ColorSelect, idx => new ColorSelect(idx, 0))
 * accessor selectedIndex = 0;
 * ```
 */
export function emit<T extends LoomEvent>(
  _type?: Constructor<T>,
  factory?: (val: unknown) => T,
) {
  // Method decorator form
  function methodDecorator(method: Function, context: ClassMethodDecoratorContext) {
    return function (this: unknown, ...args: unknown[]) {
      const result = (method as (...a: unknown[]) => unknown).apply(this, args);
      if (result instanceof LoomEvent) bus.emit(result);
      return result;
    };
  }

  // Auto-accessor decorator form (field with @reactive)
  function accessorDecorator<This extends object, V>(
    _target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
  ) {
    const field = String(context.name);
    context.addInitializer(function (this: any) {
      if (!this[EMITTERS]) this[EMITTERS] = [];
      this[EMITTERS].push({ field, factory });
    });
  }

  // Return a unified decorator that handles both method and accessor
  return (value: Function | ClassAccessorDecoratorTarget<any, any>, context: ClassMethodDecoratorContext | ClassAccessorDecoratorContext) => {
    if (context.kind === "method") {
      return methodDecorator(value as Function, context as ClassMethodDecoratorContext);
    }
    return accessorDecorator(value as ClassAccessorDecoratorTarget<any, any>, context as ClassAccessorDecoratorContext<any, any>);
  };
}
