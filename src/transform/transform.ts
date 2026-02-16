/**
 * Loom — Transform decorator
 *
 * @transform — Pipe a value through a transform function before it reaches
 * the property. Commonly paired with @prop for route params or attribute parsing.
 *
 * ```ts
 * @prop({ param: "id" })
 * @transform(Number)       // "42" → 42
 * userId!: number;
 * ```
 */

import { TRANSFORMS } from "../decorators/symbols";
import { createDecorator } from "../decorators/create";

export const transform = createDecorator<[fn: (value: any) => any]>((proto, key, fn) => {
  const ctor = proto.constructor;
  if (!ctor[TRANSFORMS]) ctor[TRANSFORMS] = new Map<string, Function>();
  ctor[TRANSFORMS].set(key, fn);
});
