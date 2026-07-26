/**
 * Loom — createApiState
 *
 * Pure factory (no DOM dependency) — testable in isolation.
 * Mirrors createFormState's pattern.
 */

import type { ApiState, ApiOptions, ApiCtx, InterceptRegistration } from "./types";
import { interceptRegistry } from "./registry";
import { app } from "../app";
import { CATCH_HANDLER, CATCH_HANDLERS } from "../decorators/symbols";
import { LoomResult } from "../result";
import { bus } from "../bus";
import { ApiStale } from "./events";


/** Create an ApiState<T> instance bound to a host element */
export function createApiState<T>(
  opts: ApiOptions<T>,
  scheduleUpdate: () => void,
  host?: any,
  apiName?: string,
): ApiState<T> {
  let data: T | undefined;
  let error: Error | undefined;
  let loading = true;
  let stale = false;
  let lastKey: string | undefined;
  let lastFetchTime = 0;
  let controller: AbortController | null = null;
  let fetching = false;

  const staleTime = opts.staleTime ?? 0;
  const revalidate = opts.revalidate ?? true;
  const maxRetries = opts.retry ?? 0;

  /** Whether a request is allowed right now. No gate declared means always. */
  const isEnabled = (): boolean => (opts.enabled ? opts.enabled(host) : true);

  async function runFetch(): Promise<void> {
    // A gated query has not failed and is not pending — it simply has not been
    // asked for yet. Reporting loading:true here would leave a spinner up for
    // a request that is never going to be made.
    if (!isEnabled()) {
      loading = false;
      fetching = false;
      scheduleUpdate();
      return;
    }

    // Abort any in-flight request
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;

    loading = data === undefined; // SWR: only show loading if no data yet
    error = undefined;
    stale = false;
    fetching = true;
    scheduleUpdate();

    // ── Run interceptors ──
    const ctx: ApiCtx = {
      url: "",
      headers: {},
      params: {},
      init: {},
      signal,
      fetch(url?: string, init?: RequestInit): Promise<Response> {
        let target = url ?? ctx.url ?? "";
        const paramStr = new URLSearchParams(ctx.params).toString();
        if (paramStr) target += (target.includes("?") ? "&" : "?") + paramStr;
        return fetch(target, {
          ...ctx.init,
          ...init,
          headers: {
            ...ctx.headers,
            ...(ctx.init.headers as Record<string, string> | undefined),
            ...(init?.headers as Record<string, string> | undefined),
          },
          signal,
        });
      },
    };

    if (opts.use) {
      for (const name of opts.use) {
        const reg = interceptRegistry.get(name);
        if (!reg) {
          console.warn(`[Loom] @intercept "${name}" not found in registry`);
          continue;
        }

        const result = await reg.method.call(null, ctx);

        if (result === false) {
          error = new Error(`Interceptor "${name}" blocked the request`);
          loading = false;
          fetching = false;
          scheduleUpdate();
          return;
        }
      }
    }


    // ── Execute fetch with retry ──
    let attempt = 0;
    while (true) {
      try {
        // ctx is passed as a second argument, and carries a fetch() that
        // applies whatever the interceptors put on it. Previously ctx.url,
        // ctx.headers and the merged RequestInit were all computed and then
        // thrown away — line was just `opts.fn(host)` — so an @intercept
        // setting an Authorization header silently did nothing.
        // Land the result in a local first. A superseded request must not
        // overwrite newer data, and signal.aborted was only checked in catch —
        // a user fn that ignores the signal resolves perfectly normally.
        const result = await opts.fn(host, ctx);
        if (signal.aborted) { fetching = false; return; }
        data = result;

        // ── Run pipe (after) interceptors ──
        if (opts.pipe) {
          for (const name of opts.pipe) {
            const reg = interceptRegistry.get(name);
            if (!reg) {
              console.warn(`[Loom] @intercept pipe "${name}" not found in registry`);
              continue;
            }
            ctx.response = data as any; // expose raw result to transformer
            const result = await reg.method.call(null, ctx);
            if (result !== undefined) {
              data = result;
            }
          }
        }

        error = undefined;
        loading = false;
        fetching = false;
        lastFetchTime = Date.now();
        scheduleUpdate();
        return;
      } catch (e) {
        if (signal.aborted) {
          fetching = false;
          return; // Key changed or disconnected — silently stop
        }
        attempt++;
        if (attempt > maxRetries) {
          error = e instanceof Error ? e : new Error(String(e));
          loading = false;
          fetching = false;

          // Invoke @catch_ handler if present on host
          // Named handler (@catch_("name")) takes priority over catch-all
          const namedMap = (host as any)?.[CATCH_HANDLERS.key];
          const catchFn = (apiName && namedMap?.get(apiName)) || (host as any)?.[CATCH_HANDLER.key];
          if (typeof catchFn === "function") {
            try { catchFn(error, host); } catch (_) { /* handler threw — swallow */ }
          }

          scheduleUpdate();
          return;
        }
        // Exponential backoff: 200ms, 400ms, 800ms...
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
        // Re-check after sleeping — the key may have changed mid-backoff, and
        // the loop would otherwise keep retrying against the old one.
        if (signal.aborted) { fetching = false; return; }
      }
    }
  }

  /** Check if current key matches — if not, refetch */
  function checkKey(): void {
    if (!opts.key) return;
    const newKey = opts.key(host);
    if (newKey !== lastKey) {
      lastKey = newKey;
      // Deferred: checkKey() runs inside the `data` getter, which is read
      // during a traced update(). Starting the fetch synchronously called
      // scheduleUpdate() mid-render, re-entering the render that was reading
      // the property.
      queueMicrotask(runFetch);
    }
  }

  /**
   * Re-arm once the gate opens.
   *
   * A query gated on a prop has no key change to react to when that prop
   * finally arrives — `enabled` flips but the key was undefined before and is
   * undefined-shaped still. Deferred for the same reason checkKey() is: this
   * runs inside a getter read during a traced render.
   */
  let gateOpen = false;
  function checkGate(): void {
    if (!opts.enabled) return;
    const open = isEnabled();
    if (open && !gateOpen && data === undefined && !fetching) {
      gateOpen = true;
      queueMicrotask(runFetch);
    } else if (!open) {
      gateOpen = false;
    }
  }

  /**
   * Mark data stale once staleTime has elapsed, and revalidate.
   *
   * Marking alone was the whole of the old behaviour, which made "stale-while-
   * revalidate" only the first half: nothing ever refetched, so the flag sat
   * true until something else happened to change the key. The refetch is
   * deferred for the same reason checkKey()'s is -- this runs inside a getter
   * read during a traced render, and starting the fetch synchronously would
   * re-enter that render.
   *
   * Only one goes out: runFetch() clears `stale` and sets `fetching`, and the
   * `fetching` guard covers the window before the microtask runs.
   */
  function checkStale(): void {
    if (staleTime > 0 && lastFetchTime > 0 && !stale) {
      if (Date.now() - lastFetchTime > staleTime) {
        stale = true;
        const shouldRefetch = revalidate && !fetching;
        // One microtask for both: announcing and refetching are the same
        // transition, and neither may run synchronously from this getter.
        queueMicrotask(() => {
          bus.emit(new ApiStale(apiName ?? "", lastKey, host));
          if (shouldRefetch && !fetching) runFetch();
        });
      }
    }
  }


  const state: ApiState<T> = {
    get ok() {
      return data !== undefined && error === undefined;
    },
    get data() {
      checkKey();
      checkGate();
      checkStale();
      return data;
    },
    get error() {
      return error;
    },
    get loading() {
      return loading;
    },
    get fetching() {
      return fetching;
    },
    get stale() {
      checkStale();
      return stale;
    },
    async refetch() {
      await runFetch();
    },
    invalidate() {
      data = undefined;
      error = undefined;
      stale = true;
      runFetch();
    },
    dispose() {
      // Abort any in-flight request. Without this an @api on a routed page
      // kept fetching after navigation and called scheduleUpdate() on a
      // detached element.
      controller?.abort();
      controller = null;
    },

    // ── LoomResult combinators ──

    unwrap(): T {
      if (data !== undefined && error === undefined) return data;
      throw error ?? new Error("unwrap() called on loading ApiState");
    },
    unwrap_or(fallback: T): T {
      return (data !== undefined && error === undefined) ? data : fallback;
    },
    map<U>(fn: (value: T) => U): LoomResult<U, Error> {
      if (data !== undefined && error === undefined) return LoomResult.ok(fn(data));
      return LoomResult.err(error ?? new Error("No data"));
    },
    map_err<F>(fn: (e: Error) => F): LoomResult<T, F> {
      if (data !== undefined && error === undefined) return LoomResult.ok(data);
      return LoomResult.err(fn(error ?? new Error("No data")));
    },
    and_then<U>(fn: (value: T) => LoomResult<U, Error>): LoomResult<U, Error> {
      if (data !== undefined && error === undefined) return fn(data);
      return LoomResult.err(error ?? new Error("No data"));
    },
    match<R>(cases: { ok: (data: T) => R; err: (error: Error) => R; loading?: () => R; [_: string]: unknown }): R {
      // Tri-state: loading (initial fetch, no data yet) → ok → err
      if (loading && data === undefined && error === undefined && cases.loading) {
        return cases.loading();
      }
      return (data !== undefined && error === undefined)
        ? cases.ok(data)
        : cases.err(error ?? new Error("No data"));
    },
  };

  // Fire the initial fetch. runFetch() no-ops while the gate is shut, and
  // `data` re-checks it on every read, so the request goes out on the first
  // render after the gate opens.
  if (opts.key) {
    lastKey = opts.key(host);
  }
  runFetch();

  return state;
}
