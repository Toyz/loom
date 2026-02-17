/**
 * Loom — createApiState
 *
 * Pure factory (no DOM dependency) — testable in isolation.
 * Mirrors createFormState's pattern.
 */

import type { ApiState, ApiOptions, ApiCtx, InterceptRegistration } from "./types";
import { interceptRegistry } from "./registry";
import { app } from "../app";
import { INJECT_PARAMS } from "../decorators/symbols";

/** Create an ApiState<T> instance bound to a host element */
export function createApiState<T>(
  opts: ApiOptions<T>,
  scheduleUpdate: () => void,
  host?: any,
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
  const maxRetries = opts.retry ?? 0;

  async function runFetch(): Promise<void> {
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
    };

    if (opts.use) {
      for (const name of opts.use) {
        const reg = interceptRegistry.get(name);
        if (!reg) {
          console.warn(`[Loom] @intercept "${name}" not found in registry`);
          continue;
        }

        // Resolve @inject params (same pattern as @guard in router)
        const args = resolveInjectParams(reg.method, reg.key);
        const result = await reg.method.call(null, ctx, ...args);

        if (result === false) {
          error = new Error(`Interceptor "${name}" blocked the request`);
          loading = false;
          fetching = false;
          scheduleUpdate();
          return;
        }
      }
    }

    // Merge ctx.params into URL
    let url = ctx.url || "";
    const paramStr = new URLSearchParams(ctx.params).toString();
    if (paramStr) {
      url += (url.includes("?") ? "&" : "?") + paramStr;
    }

    // Build final RequestInit
    const init: RequestInit = {
      ...ctx.init,
      headers: { ...ctx.headers, ...(ctx.init.headers as Record<string, string> | undefined) },
      signal,
    };

    // ── Execute fetch with retry ──
    let attempt = 0;
    while (true) {
      try {
        // The user's fn does the actual fetch — we pass interceptor-enriched context
        // via host element (the fn can read ctx through closure or we modify fetch globally)
        // Actually: the fn is user-provided and does its own fetch().
        // Interceptors modify the context which the user accesses if they want,
        // but the PRIMARY use is: interceptor sets headers, we wrap fetch.
        data = await opts.fn(host);
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
          scheduleUpdate();
          return;
        }
        // Exponential backoff: 200ms, 400ms, 800ms...
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt - 1)));
      }
    }
  }

  /** Check if current key matches — if not, refetch */
  function checkKey(): void {
    if (!opts.key) return;
    const newKey = opts.key(host);
    if (newKey !== lastKey) {
      lastKey = newKey;
      runFetch();
    }
  }

  /** Check if stale */
  function checkStale(): void {
    if (staleTime > 0 && lastFetchTime > 0 && !stale) {
      if (Date.now() - lastFetchTime > staleTime) {
        stale = true;
      }
    }
  }

  // Resolve @inject params for interceptor methods
  function resolveInjectParams(method: Function, methodKey: string): any[] {
    const proto = method;
    const injectMeta: Array<{ method: string; index: number; key: any }> =
      (proto as any)[INJECT_PARAMS] ?? [];
    const methodParams = injectMeta
      .filter((m) => m.method === methodKey)
      .sort((a, b) => a.index - b.index);

    if (methodParams.length === 0) return [];

    const args: any[] = [];
    for (const param of methodParams) {
      args[param.index] = app.get(param.key);
    }
    return args;
  }

  const state: ApiState<T> = {
    get data() {
      checkKey();
      checkStale();
      return data;
    },
    get error() {
      return error;
    },
    get loading() {
      return loading;
    },
    get stale() {
      checkStale();
      return stale;
    },
    async refetch() {
      await runFetch();
    },
    invalidate() {
      stale = true;
      runFetch();
    },
  };

  // Fire initial fetch
  if (opts.key) {
    lastKey = opts.key(host);
  }
  runFetch();

  return state;
}
