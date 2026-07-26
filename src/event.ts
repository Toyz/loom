/**
 * Loom — LoomEvent base class
 *
 * All events extend this. Gives you for free:
 * - timestamp (auto-stamped)
 * - clone(overrides?) — typed shallow clone
 * - is(event) — static type guard
 * - dispatch(...args) — static emit through global bus
 * - toJSON() — serialize to plain object
 * - toString() — debug-friendly string
 */

import type { Constructor } from "./bus";
import { bus } from "./bus";

/**
 * Stable per-class token for dedup keys.
 *
 * The bus keeps ONE dedup Set for every event type, so a derived key has to
 * be namespaced by its class or two unrelated events with the same payload
 * shape would cancel each other out. `constructor.name` would do it, and is
 * exactly wrong: minifiers rename classes, which is the same trap that makes
 * `keepNames` load-bearing elsewhere. An identity-keyed token has no such
 * dependency.
 */
const CLASS_TOKENS = new WeakMap<Function, string>();
let nextClassToken = 0;

interface Resolved { token: string; spec: true | readonly string[] }
const RESOLVED = new WeakMap<Function, Resolved | null>();

function resolveDedupe(ctor: Function): Resolved | null {
  let r = RESOLVED.get(ctor);
  if (r !== undefined) return r;
  const spec = (ctor as typeof LoomEvent).dedupe;
  r = spec ? { token: "e" + nextClassToken++, spec: spec as true | readonly string[] } : null;
  RESOLVED.set(ctor, r);
  return r;
}

/**
 * @typeParam T - Payload shape. Declaring it gives the subclass a constructor
 * taking that payload, reachable as `.data`, with no boilerplate:
 *
 * ```ts
 * class ThemeChanged extends LoomEvent<{ theme: string }> {}
 * bus.emit(new ThemeChanged({ theme: "dark" }));   // e.data.theme
 * ```
 *
 * Leave it off and the class behaves exactly as before — declare your own
 * constructor and fields. Nothing that already extends `LoomEvent` changes.
 */
export abstract class LoomEvent<T = void> {
  /** Auto-stamped on creation */
  readonly timestamp = Date.now();

  /**
   * The payload, when the class declared one via `LoomEvent<T>`.
   * `undefined` for the classic form, which carries its own fields instead.
   */
  readonly data!: T;

  /**
   * Takes the payload when `T` is declared, and nothing when it is not — so
   * `super()` in an existing subclass still typechecks.
   */
  constructor(...args: T extends void ? [] : [data: T]) {
    if (args.length) (this as { data: T }).data = args[0] as T;
  }

  /** Set to true by cancel() — stops subsequent handlers and parent propagation */
  cancelled = false;

  /** Stop dispatching to remaining handlers and parent event types */
  cancel(): void { this.cancelled = true; }

  /**
   * Opt in to dedup derived from `data`, instead of writing a key by hand.
   *
   * `true` uses every field; a list of field names uses just those, which is
   * what you want when the payload carries something incidental like a
   * timestamp or a request id that should not make two events distinct.
   *
   * ```ts
   * class ThemeChanged extends LoomEvent<{ theme: string; at: number }> {
   *   static override dedupe = ["theme"] as const;
   * }
   * ```
   *
   * Deliberately opt-in. Deduping every event by default would silently drop
   * the second of two identical commands — "increment" twice in a flush is
   * two increments, not one.
   */
  static dedupe?: boolean | readonly string[];

  /**
   * Frame-scoped dedup key. If two events return the same one in a single
   * synchronous flush, only the first reaches handlers.
   *
   * Derived from `data` when the class sets `static dedupe`; otherwise
   * `undefined`, meaning no dedup. Override it directly for anything the
   * derivation cannot express.
   *
   * ```ts
   * class ThemeChanged extends LoomEvent {
   *   constructor(public theme: string) { super(); }
   *   override get dedupeKey() { return `theme:${this.theme}`; }
   * }
   * ```
   */
  get dedupeKey(): string | undefined {
    const resolved = resolveDedupe(this.constructor);
    if (resolved === null) return undefined;
    const { token, spec } = resolved;
    const d = this.data as unknown;
    // A non-object payload is its own key; there are no fields to pick from.
    if (d === null || typeof d !== "object") return `${token}:${String(d)}`;

    const rec = d as Record<string, unknown>;
    // Sorted, so key order in the payload cannot change the identity.
    const keys = spec === true ? Object.keys(rec).sort() : spec;
    let out = token;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i] as string;
      out += `:${k}=${String(rec[k])}`;
    }
    return out;
  }

  /** Construct and emit this event through the global bus */
  static dispatch<T extends LoomEvent>(
    this: new (...args: unknown[]) => T,
    ...args: ConstructorParameters<typeof this>
  ): void {
    bus.emit(new this(...args));
  }

  /** Construct this event without emitting — useful for building, inspecting, or cloning before dispatch */
  static create<T extends LoomEvent>(
    this: new (...args: unknown[]) => T,
    ...args: ConstructorParameters<typeof this>
  ): T {
    return new this(...args);
  }

  /** Shallow clone with optional overrides */
  clone(overrides?: Partial<this>): this {
    return Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this,
      overrides,
    );
  }

  /** Type guard — `if (SomeEvent.is(event))` */
  static is<T extends LoomEvent>(
    this: Constructor<T>,
    event: unknown,
  ): event is T {
    return event instanceof this;
  }

  /** Serialize to plain object (strips methods) */
  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(this)) {
      out[key] = (this as unknown as Record<string, unknown>)[key];
    }
    return out;
  }

  /** Debug-friendly string */
  toString(): string {
    return `${this.constructor.name}(${JSON.stringify(this.toJSON())})`;
  }
}
