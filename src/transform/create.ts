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
 * // Use it:
 * @prop({ param: "id" })
 * @toNumber
 * userId!: number;
 * ```
 */

import { TRANSFORMS } from "../decorators/symbols";

export function createTransform<In = any, Out = any>(
  fn: (value: In) => Out,
): (target: any, key: string) => void {
  return (proto: any, key: string) => {
    const ctor = proto.constructor;
    if (!ctor[TRANSFORMS]) ctor[TRANSFORMS] = new Map<string, Function>();
    ctor[TRANSFORMS].set(key, fn);
  };
}
