/**
 * LoomFlags — FlagProvider abstract class
 *
 * Base class for all flag providers. Extend this and implement
 * isEnabled() and getVariant(). Register via DI:
 *
 *   app.use(FlagProvider, new MyProvider());
 *
 * Providers can call set() to update flags at runtime — this fires
 * FlagChanged on the Loom bus, causing all @flag decorators and
 * <loom-flag> components to re-evaluate reactively.
 */

import { app, bus } from "@toyz/loom";
import { FlagChanged } from "./events";

export abstract class FlagProvider {
  /** Internal flag cache — providers maintain their own state */
  protected flags = new Map<string, boolean>();
  protected variants = new Map<string, string>();

  /** Check if a flag is enabled */
  abstract isEnabled(flag: string, context?: Record<string, any>): boolean;

  /** Get a flag's variant value */
  abstract getVariant<T = string>(flag: string, fallback: T): T;

  /**
   * Update a flag at runtime — fires FlagChanged on the bus.
   * Call this from WebSocket handlers, SSE listeners, polling loops, etc.
   */
  set(flag: string, enabled: boolean): void {
    this.flags.set(flag, enabled);
    bus.emit(new FlagChanged(flag, enabled));
  }

  /** Update a variant at runtime — fires FlagChanged on the bus */
  setVariant(flag: string, value: string): void {
    this.variants.set(flag, value);
    bus.emit(new FlagChanged(flag, this.isEnabled(flag), value));
  }
}
