/**
 * Query lifecycle events.
 *
 * `.stale` and `fetching` tell a component about its own request. Neither
 * helps anything *else* react to it — a cache layer, a sync indicator in a
 * toolbar, a logger, or a second view that wants to refresh alongside. Those
 * live outside the component and have no reference to its accessor.
 *
 * So staleness is announced on the bus, which is the mechanism the rest of
 * Loom already uses for "something happened that others may care about":
 *
 * ```ts
 * @on(ApiStale)
 * onStale(e: ApiStale) {
 *   if (e.key?.startsWith("/api/users")) this.refreshSidebar();
 * }
 * ```
 *
 * Emitted once per stale transition, not per read — `checkStale()` flips the
 * flag before emitting and only a fetch clears it — and always from a
 * microtask, never synchronously from the getter. Emitting inline would run
 * handlers in the middle of the traced render that read `.data`, and a
 * handler calling `scheduleUpdate()` would re-enter it. That is the same
 * hazard the key check already defers for.
 */

import { LoomEvent } from "../event";

/**
 * An `@api` or `@fetch` accessor's data has passed its `staleTime`.
 *
 * Fires whether or not the query revalidates: with `revalidate: false` this
 * is the signal, and with the default it is a notification that a background
 * refetch is starting.
 */
export class ApiStale extends LoomEvent {
  constructor(
    /** The accessor's name, e.g. `"user"`. */
    readonly name: string,
    /**
     * The resolved cache key. For `@fetch` this is the URL that was
     * requested, including serialised params — which is what makes matching
     * on a path prefix work. Undefined when the query declares no key.
     */
    readonly key: string | undefined,
    /** The component or object the accessor lives on. */
    readonly host: unknown,
  ) {
    super();
  }

  /**
   * One event per accessor per flush. A component reading `.data` several
   * times in one render would otherwise announce the same transition twice.
   */
  override get dedupeKey() {
    return `api-stale:${this.name}:${this.key ?? ""}`;
  }
}
