/**
 * Loom — Typed transform
 *
 * Schema-based transform helper and decorator. Converts raw string records
 * into typed objects according to a schema.
 *
 * Function form (for manual use):
 * ```ts
 * @prop({params})
 * @transform(typed<UserParams>({ id: Number }))
 * routeParams!: UserParams;
 * ```
 *
 * Decorator form (shorthand):
 * ```ts
 * @prop({params})
 * @typedTransformer<UserParams>({ id: Number })
 * accessor routeParams!: UserParams;
 * ```
 */

import { transform } from "./transform.js";

export interface TransformSchema<T> {
  [key: string]: (v: string) => T[keyof T];
}

/**
 * Build a typed transform function from a schema object.
 * Use with @transform() or standalone.
 */
export function typed<T>(schema: TransformSchema<T>): (raw: Record<string, string>) => T {
  return (raw) => {
    const out = {} as Record<string, unknown>;
    for (const [k, fn] of Object.entries(schema)) {
      if (k in raw) out[k] = fn(raw[k]);
    }
    return out as T;
  };
}

/**
 * Decorator: apply a typed schema transform directly.
 * Shorthand for `@transform(typed<T>(schema))` — and implemented as exactly
 * that, so there is one registration path rather than two that can drift.
 *
 * ```ts
 * @prop({params})
 * @typedTransformer<UserParams>({ id: Number, name: String })
 * accessor routeParams!: UserParams;
 * ```
 */
export function typedTransformer<T>(schema: TransformSchema<T>) {
  return transform<any, any>(typed<T>(schema) as (value: unknown) => any);
}
