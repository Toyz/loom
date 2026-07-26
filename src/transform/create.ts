/**
 * Loom — createTransform
 *
 * Factory for building reusable @transform decorators.
 * Returns a property decorator that pipes values through the given function.
 *
 * ```ts
 * // Create a reusable transform decorator
 * const toNumber = createTransform(Number);
 * const toDate = createTransform((v: string) => new Date(v));
 *
 * // Use it — note `accessor`, these are auto-accessor decorators:
 * @prop({ param: "id" })
 * @toNumber
 * accessor userId!: number;
 * ```
 */

import { TRANSFORMS } from "../decorators/symbols";

/**
 * Build a reusable `@transform`-style auto-accessor decorator.
 *
 * TC39 stage 3 calls a decorator as `(value, context)`, not the legacy
 * `(prototype, key)`. This used to assume the legacy shape, so on a plain
 * field it threw at class-definition time (`proto` was `undefined`) and on an
 * `accessor` it silently registered the transform on `Object` under a key that
 * was the context object. Mirrors the shape in ./transform.ts.
 */
export function createTransform<In = any, Out = any>(fn: (value: In) => Out) {
  return <This extends object, V>(
    _target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
  ): void => {
    const key = String(context.name);
    context.addInitializer(function (this: This) {
      const ctor = (this as object & { constructor: object }).constructor;
      TRANSFORMS.ownMap<string, Function>(ctor).set(key, fn as unknown as Function);
    });
  };
}
