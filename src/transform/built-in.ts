/**
 * Loom — Built-in transforms
 *
 * Pre-built transform decorators created with createTransform.
 * These are ready-to-use property decorators that pipe values
 * through standard JavaScript coercion functions.
 *
 * ```ts
 * @prop({ param: "id" })
 * @toNumber
 * userId!: number;
 *
 * @prop({ param: "active" })
 * @toBoolean
 * isActive!: boolean;
 *
 * @prop({ param: "created" })
 * @toDate
 * createdAt!: Date;
 * ```
 */

import { createTransform } from "./create";

/** Coerce to number via Number() */
export const toNumber = createTransform<string, number>(Number);

/** Coerce to boolean — "true" and "1" → true, everything else → false */
export const toBoolean = createTransform<string, boolean>(
  (v) => v === "true" || v === "1",
);

/** Parse ISO date string to Date object */
export const toDate = createTransform<string, Date>(
  (v) => new Date(v),
);

/** Parse JSON string to object */
export const toJSON = createTransform<string, any>(
  (v) => JSON.parse(v),
);

/** Trim whitespace */
export const toTrimmed = createTransform<string, string>(
  (v) => v.trim(),
);

/** Coerce to integer via parseInt */
export const toInt = createTransform<string, number>(
  (v) => parseInt(v, 10),
);

/** Coerce to float via parseFloat */
export const toFloat = createTransform<string, number>(parseFloat);
