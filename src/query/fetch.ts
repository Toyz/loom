/**
 * `@fetch` — the common case of `@api`, without the boilerplate.
 *
 * Almost every `@api` in practice is the same four lines: build a URL from a
 * prop, call fetch, check the response, parse JSON. Written by hand that is
 * also four chances to get it wrong, and the third one is usually skipped —
 * `fetch()` resolves for 404 and 500, so a hand-rolled `.then(r => r.json())`
 * lands an error page in `data` and reports `ok: true`.
 *
 * ```ts
 * @fetch<User>((el) => `/api/users/${el.userId}`)
 * accessor user!: ApiState<User>;
 * ```
 *
 * What it adds over writing the `fn` yourself:
 *
 *  - **Interceptors apply.** It goes through `ctx.fetch`, so an `@intercept`
 *    that sets an Authorization header actually affects the request. A plain
 *    `fetch()` inside `fn` bypasses the context entirely, which is a quiet
 *    way to lose auth on exactly the requests that need it.
 *  - **Non-2xx throws.** The response lands in `error` as an `HttpError`
 *    carrying the status, instead of being parsed as if it were data.
 *  - **The key is derived from the URL.** Change the prop the URL is built
 *    from and it refetches, with no separate `key` to keep in sync — the two
 *    drifting apart is its own class of bug.
 *  - **`params` are serialised** and merged with anything an interceptor
 *    added, rather than being concatenated by hand.
 *
 * Naming note: importing this shadows the global `fetch` in that module. If
 * you need both, `import { fetch as fetchJson }`.
 */

import type { ApiCtx, ApiOptions, ApiState } from "./types";
import { api } from "./decorators";

/** The global, captured before the export below shadows the name locally. */
const nativeFetch = globalThis.fetch;

/**
 * A non-2xx response.
 *
 * `fetch()` only rejects on network failure, so without this a 500 is
 * indistinguishable from success until something downstream trips over the
 * shape of the body.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    /** Parsed body if it could be read — often the API's own error shape. */
    readonly body?: unknown,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

/** How to read the response body. */
export type FetchAs = "json" | "text" | "response";

export interface FetchOptions<El = any>
  extends Omit<ApiOptions<any, El>, "fn" | "key"> {
  /** The URL, or a function of the host element. */
  url: string | ((el: El) => string);
  /** Query parameters, merged with anything an interceptor added. */
  params?: Record<string, unknown> | ((el: El) => Record<string, unknown>);
  /** Method, body, credentials, and so on. */
  init?: RequestInit;
  /** Body handling. `response` hands back the raw Response. Default `json`. */
  as?: FetchAs;
  /**
   * Override the derived cache key. By default the key is the resolved URL
   * and params, which is what you want unless the same URL can legitimately
   * return different things.
   */
  key?: (el: El) => string;
}

const resolve = <El, T>(v: T | ((el: El) => T), el: El): T =>
  typeof v === "function" ? (v as (el: El) => T)(el) : v;

/** Stable serialisation, so key equality does not depend on property order. */
function serialiseParams(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const usable = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!usable.length) return "";
  usable.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new URLSearchParams(usable.map(([k, v]) => [k, String(v)])).toString();
}

/**
 * Declarative GET-and-parse, on top of `@api`.
 *
 * Accepts a URL, a function of the host, or a full options object. Everything
 * `@api` understands — `enabled`, `retry`, `staleTime`, `use`, `pipe` — passes
 * straight through.
 */
export function fetch<T extends object, El = any>(
  urlOrOpts: string | ((el: El) => string) | FetchOptions<El>,
) {
  const opts: FetchOptions<El> =
    typeof urlOrOpts === "string" || typeof urlOrOpts === "function"
      ? { url: urlOrOpts }
      : urlOrOpts;

  const mode: FetchAs = opts.as ?? "json";

  /** The URL this call will actually hit, params included. */
  const target = (el: El): string => {
    const base = resolve(opts.url, el) ?? "";
    const qs = serialiseParams(resolve(opts.params, el) as Record<string, unknown>);
    if (!qs) return base;
    return base + (base.includes("?") ? "&" : "?") + qs;
  };

  const options: ApiOptions<T, El> = {
    ...opts,
    // Default the key to the resolved URL. A URL built from a prop then
    // refetches when that prop changes without a second declaration to
    // maintain — the usual cause of a stale view is those two disagreeing.
    key: opts.key ?? ((el: El) => target(el)),

    fn: async (el: El, ctx: ApiCtx): Promise<T> => {
      const url = resolve(opts.url, el) ?? "";

      // Merge into the context rather than around it, so `use` interceptors
      // that already set headers, params or init are respected.
      const params = resolve(opts.params, el) as Record<string, unknown> | undefined;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== "") ctx.params[k] = String(v);
        }
      }
      if (opts.init) ctx.init = { ...opts.init, ...ctx.init };
      ctx.url = url;

      // ctx.fetch applies url, params, headers, init and the managed signal.
      // Falls back to the captured global only if a caller has supplied a
      // context without one.
      const res = ctx.fetch
        ? await ctx.fetch()
        : await nativeFetch(target(el), { ...opts.init, signal: ctx.signal });

      ctx.response = res;

      if (!res.ok) {
        // Read the body if we can — an API's error shape is usually the most
        // useful thing available at this point, and it is lost otherwise.
        let body: unknown;
        try {
          body = await res.clone().json();
        } catch {
          try { body = await res.text(); } catch { /* give up quietly */ }
        }
        throw new HttpError(res.status, res.url || target(el), body);
      }

      if (mode === "response") return res as unknown as T;
      if (mode === "text") return (await res.text()) as unknown as T;
      return (await res.json()) as T;
    },
  };

  return api<T>(options as ApiOptions<T>);
}

export type { ApiState };
