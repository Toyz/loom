/**
 * Loom — @readonly decorator
 *
 * Composable auto-accessor decorator that enforces immutability.
 * Stacks with @prop, @reactive, or standalone.
 *
 * ```ts
 * @prop @readonly accessor users!: User[];      // parent can update, child can't mutate
 * @reactive @readonly accessor id = crypto.randomUUID(); // set once, locked
 * @readonly accessor config = { theme: "dark" };         // standalone
 * ```
 */

const LOCKED = Symbol("loom:readonly:locked");

export function readonly<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const name = String(context.name);
  const lockKey = Symbol(`readonly:${name}`);

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
      if (this[lockKey]) {
        throw new Error(`Cannot mutate readonly property '${name}'`);
      }
      target.set.call(this, val);
      this[lockKey] = true;
    },
    init(this: any, val: V): V {
      // init runs during field initialization — allow it
      // Lock will be set on the first explicit set() call
      return val;
    },
  };
}
