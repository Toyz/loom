/**
 * Loom — @readonly decorator
 *
 * Composable auto-accessor decorator that enforces immutability.
 * Stacks with @prop, @reactive, or standalone.
 *
 * The setter is writable from OUTSIDE (parent/morph engine/DI),
 * but the component itself cannot reassign the value.
 * Objects/arrays are frozen on read to prevent in-place mutation.
 *
 * ```ts
 * @prop @readonly accessor users!: User[];      // parent can update, child can't mutate
 * @reactive @readonly accessor id = crypto.randomUUID(); // set once, locked
 * @readonly accessor config = { theme: "dark" };         // standalone
 * ```
 */

import { localSymbol } from "../decorators/symbols";

/** Flipped to true by the morph engine around prop patches */
export let _readonlyBypass = false;

export function setReadonlyBypass(v: boolean) { _readonlyBypass = v; }

export function readonly<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const name = String(context.name);
  const inited = localSymbol<boolean>(`readonly:inited:${name}`);

  return {
    get(this: This): V {
      const val = target.get.call(this) as V;
      // Freeze objects/arrays so .push(), .name = ... etc. throw
      if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
        return Object.freeze(val) as V;
      }
      return val;
    },
    set(this: This, val: V) {
      const self = this as unknown as Record<symbol, unknown>;
      // Allow: initial value, morph engine patches, and pre-init writes
      if (!self[inited.key] || _readonlyBypass) {
        target.set.call(this, val);
        self[inited.key] = true;
        return;
      }
      throw new Error(`Cannot mutate readonly property '${name}'`);
    },
    init(this: This, val: V): V {
      // init runs during field initialization — allow it
      return val;
    },
  };
}
