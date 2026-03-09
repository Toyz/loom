/**
 * Loom — Lazy Loading Events
 *
 * Global events emitted when @lazy components load.
 * Listen with @on(LazyLoadStart) or @on(LazyLoadEnd).
 */

import { LoomEvent } from "../event";

/** Emitted when a @lazy component begins loading its module */
export class LazyLoadStart extends LoomEvent {
  constructor(
    /** Custom element tag name, e.g. "settings-page" */
    public readonly tag: string,
  ) {
    super();
  }
}

/** Emitted when a @lazy component finishes loading (success or failure) */
export class LazyLoadEnd extends LoomEvent {
  constructor(
    /** Custom element tag name */
    public readonly tag: string,
    /** Whether the module loaded successfully */
    public readonly success: boolean,
    /** Milliseconds elapsed */
    public readonly duration: number,
    /** Error object if success is false */
    public readonly error?: unknown,
  ) {
    super();
  }
}
