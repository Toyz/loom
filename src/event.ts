/**
 * Loom — LoomEvent base class
 *
 * All events extend this. Gives you for free:
 * - timestamp (auto-stamped)
 * - clone(overrides?) — typed shallow clone
 * - is(event) — static type guard
 * - toJSON() — serialize to plain object
 * - toString() — debug-friendly string
 */

import type { Constructor } from "./bus";

export abstract class LoomEvent {
  /** Auto-stamped on creation */
  readonly timestamp = Date.now();

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
      out[key] = (this as any)[key];
    }
    return out;
  }

  /** Debug-friendly string */
  toString(): string {
    return `${this.constructor.name}(${JSON.stringify(this.toJSON())})`;
  }
}
