/**
 * Loom — the seam between a synced `@prop({ query })` and the router.
 *
 * `@prop` lives in `store/`, and writing a query key is the router's job. But
 * `router/outlet.ts` and `router/link.ts` already import `store/decorators`,
 * so having `store/` import the router closes a cycle -- and an ESM cycle
 * around module-level `const` is a temporal-dead-zone bug waiting for whichever
 * entry point happens to be imported first.
 *
 * So neither imports the other. This module has no dependencies at all: the
 * router registers a writer when it is constructed, and the prop accessor
 * calls through it.
 *
 * The indirection also states something true. Query sync only means anything
 * with a router mounted; without one there is no address bar to own. A
 * component using `sync` outside a routed app quietly does nothing rather
 * than throwing, because that is the same thing the URL would show.
 */

/** What the router provides. `null` removes the key. */
export type QueryWriter = (
  key: string,
  value: string | null,
  history: "replace" | "push",
) => void;

let writer: QueryWriter | null = null;
let syncing = false;

/** Called by the router when it is constructed. */
export function setQueryWriter(fn: QueryWriter | null): void {
  writer = fn;
}

/** Write one query key, or do nothing when no router is mounted. */
export function writeQueryParam(
  key: string,
  value: string | null,
  history: "replace" | "push",
): void {
  writer?.(key, value, history);
}

/**
 * True while the router is pushing route data into properties.
 *
 * The outlet assigns straight onto a synced prop during resolution. Echoing
 * that back to the URL would have the property fighting the navigation that
 * set it, so the accessor checks this before writing.
 */
export function isRouteSyncing(): boolean {
  return syncing;
}

/** Run `fn` with route-originated writes marked, so they are not echoed. */
export function duringRouteSync<T>(fn: () => T): T {
  const previous = syncing;
  syncing = true;
  try {
    return fn();
  } finally {
    syncing = previous;
  }
}
