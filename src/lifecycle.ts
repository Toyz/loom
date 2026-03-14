/**
 * Loom — LoomLifecycle interface
 *
 * Opt-in service lifecycle contract. Services that implement this interface
 * will have their methods called automatically by the app:
 *
 *   - `start()` / `stop()` — called by `app.start()` / `app.stop()`
 *   - `suspend()` / `resume()` — called on `visibilitychange` (tab hidden / visible)
 *
 * ```ts
 * @service("ws")
 * class WebSocketService implements LoomLifecycle<"start" | "stop" | "suspend" | "resume"> {
 *   start()   { this.ws.connect(); }
 *   stop()    { this.ws.disconnect(); }
 *   suspend() { this.ws.pauseHeartbeat(); }  // tab hidden
 *   resume()  { this.ws.reconnect(); }       // tab visible
 * }
 * ```
 *
 * The generic parameter enforces which hooks the service declares.
 * Hooks not in T become `never` — calling them is a compile-time error.
 */

export type LifecycleHook = "start" | "stop" | "suspend" | "resume";

/**
 * Service lifecycle interface.
 *
 * @template T - The lifecycle hooks this service supports.
 */
export type LoomLifecycle<T extends LifecycleHook> =
  ("start"   extends T ? { start():   void | Promise<void> } : {}) &
  ("stop"    extends T ? { stop():    void | Promise<void> } : {}) &
  ("suspend" extends T ? { suspend(): void | Promise<void> } : {}) &
  ("resume"  extends T ? { resume():  void | Promise<void> } : {});

/** Type guard — returns true if the value has a callable `start` method */
export function hasStart(v: unknown): v is { start: () => void | Promise<void> } {
  return typeof (v as any)?.start === "function";
}

/** Type guard — returns true if the value has a callable `stop` method */
export function hasStop(v: unknown): v is { stop: () => void | Promise<void> } {
  return typeof (v as any)?.stop === "function";
}

/** Type guard — returns true if the value has a callable `suspend` method */
export function hasSuspend(v: unknown): v is { suspend: () => void | Promise<void> } {
  return typeof (v as any)?.suspend === "function";
}

/** Type guard — returns true if the value has a callable `resume` method */
export function hasResume(v: unknown): v is { resume: () => void | Promise<void> } {
  return typeof (v as any)?.resume === "function";
}
