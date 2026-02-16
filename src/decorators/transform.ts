/**
 * @transform — Type conversion for route params/query values.
 *
 * Accepts any `(value: any) => T` function. Built-in constructors
 * like `Number` and `Boolean` work natively since they match the signature.
 *
 * ```ts
 * @prop({ param: "id" })
 * @transform(Number)
 * userId!: number;  // "42" → 42
 *
 * @prop({ param: "tags" })
 * @transform((v) => v.split(","))
 * tags!: string[];  // "a,b,c" → ["a", "b", "c"]
 * ```
 *
 * For full object decomposition, use `typed<T>()`:
 *
 * ```ts
 * interface MyParams { id: number; slug: string }
 *
 * @prop({ params })
 * @transform(typed<MyParams>({ id: Number }))
 * routeParams!: MyParams;
 * ```
 */

import { TRANSFORMS } from "./symbols";

export function transform(fn: (value: any) => any) {
  return (target: any, key: string) => {
    const ctor = target.constructor;
    if (!ctor[TRANSFORMS]) ctor[TRANSFORMS] = new Map<string, Function>();
    ctor[TRANSFORMS].set(key, fn);
  };
}

/**
 * Type-safe field-level transform for object decomposition.
 *
 * Schema keys must match fields of `T`. Each converter must return
 * the correct type for that field. Unlisted fields pass through as-is.
 *
 * ```ts
 * interface MyParams { id: number; slug: string }
 * typed<MyParams>({ id: Number })
 * // → { id: 42, slug: "hello" }
 * ```
 */
type TransformSchema<T> = {
  [K in keyof T]?: (raw: string) => T[K];
};

export function typed<T>(schema: TransformSchema<T>): (raw: Record<string, string>) => T {
  return (raw: Record<string, string>): T => {
    const result: any = { ...raw };
    for (const key of Object.keys(schema)) {
      const fn = (schema as any)[key];
      if (fn && key in result) {
        result[key] = fn(result[key]);
      }
    }
    return result as T;
  };
}
