/**
 * Loom — LoomLifecycle interface
 *
 * Opt-in service lifecycle contract. Services that implement this interface
 * will have their `start()` and/or `stop()` methods called automatically
 * by `app.start()` and `app.stop()`.
 *
 * ```ts
 * @service("ws")
 * class WebSocketService implements LoomLifecycle<"start" | "stop"> {
 *   start() { this.ws.connect(); }
 *   stop()  { this.ws.disconnect(); }
 * }
 *
 * // No manual call needed in main.ts — app.start() handles it.
 * ```
 *
 * The generic parameter enforces which hooks the service declares.
 * Hooks not in T become `never` — calling them is a compile-time error.
 *
 * ```ts
 * class AnalyticsService implements LoomLifecycle<"start"> {
 *   start() { this.track("app_boot"); }
 *   // stop() is `never` — calling it won't compile
 * }
 * ```
 */

export type LifecycleHook = "start" | "stop";

/**
 * Service lifecycle interface.
 *
 * @template T - The lifecycle hooks this service supports ("start" | "stop" or either alone).
 */
export type LoomLifecycle<T extends LifecycleHook> = {
  start: "start" extends T ? () => void | Promise<void> : never;
  stop:  "stop"  extends T ? () => void | Promise<void> : never;
};

/** Type guard — returns true if the value has a callable `start` method */
export function hasStart(v: unknown): v is { start: () => void | Promise<void> } {
  return typeof (v as any)?.start === "function";
}

/** Type guard — returns true if the value has a callable `stop` method */
export function hasStop(v: unknown): v is { stop: () => void | Promise<void> } {
  return typeof (v as any)?.stop === "function";
}
