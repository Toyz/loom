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

/** Flipped to true by the morph engine around prop patches */
export let _readonlyBypass = false;

export function setReadonlyBypass(v: boolean) { _readonlyBypass = v; }

export function readonly<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const name = String(context.name);
  const initedKey = Symbol(`readonly:inited:${name}`);

  return {
    get(this: any): V {
      const val = target.get.call(this) as V;
      // Freeze objects/arrays so .push(), .name = ... etc. throw
      if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
        return Object.freeze(val) as V;
      }
      return val;
    },
    set(this: any, val: V) {
      // Allow: initial value, morph engine patches, and pre-init writes
      if (!this[initedKey] || _readonlyBypass) {
        target.set.call(this, val);
        this[initedKey] = true;
        return;
      }
      throw new Error(`Cannot mutate readonly property '${name}'`);
    },
    init(this: any, val: V): V {
      // init runs during field initialization — allow it
      return val;
    },
  };
}
