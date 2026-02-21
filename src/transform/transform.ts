/**
 * Loom — Transform decorator (TC39 Stage 3)
 *
 * @transform — Pipe a value through a transform function before it reaches
 * the property. Commonly paired with @prop for route params or attribute parsing.
 *
 * ```ts
 * @prop({ param: "id" })
 * @transform(Number)       // "42" → 42
 * accessor userId!: number;
 * ```
 */

import { TRANSFORMS } from "../decorators/symbols";

/**
 * Auto-accessor decorator that registers a transform function.
 * The transform is applied by @component's attributeChangedCallback.
 */
export function transform<This extends object, V>(fn: (value: unknown) => V) {
  return (
    _target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
  ): void => {
    const key = String(context.name);
    context.addInitializer(function (this: any) {
      const ctor = this.constructor;
      if (!ctor[TRANSFORMS.key]) ctor[TRANSFORMS.key] = new Map<string, Function>();
      ctor[TRANSFORMS.key].set(key, fn);
    });
  };
}
