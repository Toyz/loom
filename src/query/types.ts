/**
 * Loom — @api types
 *
 * Shared interfaces for the API query module.
 */

// ── Interceptor ──

/** Context passed to @intercept methods — mutate properties to modify the fetch */
export interface ApiCtx {
  /** Request URL — prepend base, append paths */
  url: string;
  /** Request headers — add auth tokens, content type */
  headers: Record<string, string>;
  /** Query params — merged into URL as ?key=val */
  params: Record<string, string>;
  /** Raw RequestInit overrides — method, body, credentials, etc */
  init: RequestInit;
  /** Auto-managed AbortSignal — read-only */
  signal: AbortSignal;
  /** Raw Response object — available in `pipe` (after) interceptors */
  response?: Response;
  /**
   * fetch() with this context applied: `url`/`params` build the URL, `headers`
   * and `init` are merged, and the managed AbortSignal is attached.
   *
   * Use this from an `@api({ fn })` to have `@intercept` actually take effect —
   * a plain global `fetch()` cannot see anything an interceptor set.
   *
   * ```ts
   * @api({ use: ["auth"], fn: (el, ctx) => ctx.fetch(`/api/user/${el.id}`).then(r => r.json()) })
   * accessor user!: ApiState<User>;
   * ```
   */
  fetch(url?: string, init?: RequestInit): Promise<Response>;
}

/** Registration entry in the global intercept registry */
export interface InterceptRegistration {
  method: Function;
  key: string;
  /** When true, this interceptor runs after the fetch (response transformer) */
  after?: boolean;
}

// ── API State ──

/** Reactive state container for an @api-decorated accessor — extends LoomResult<T> */
export interface ApiState<T, E = Error> {
  /** True if the last fetch succeeded (or data exists from cache) */
  readonly ok: boolean;
  /** Resolved data (undefined while loading or on error) */
  readonly data: T | undefined;
  /** Error from the last fetch attempt */
  readonly error: E | undefined;
  /** True during the initial fetch — no data has ever arrived yet. */
  readonly loading: boolean;
  /**
   * True whenever a request is in flight, including a background revalidation
   * that already has data to show.
   *
   * `loading` is for "there is nothing to render yet"; this is for "what you
   * are looking at may be about to change". A spinner that blanks the screen
   * on every refetch is the bug this distinction prevents.
   *
   * Optional because ApiState is a structural contract that packages outside
   * this repo implement -- loom-rpc's RpcQuery extends it, compiled against
   * whichever version of loom it depends on. Making a new member required is
   * a breaking change to every one of those, for a field they cannot have
   * known to add. Loom's own @api always provides it.
   */
  readonly fetching?: boolean;
  /** True when staleTime has elapsed since last successful fetch */
  readonly stale: boolean;
  /** Manually re-execute the fetch */
  refetch(): Promise<void>;
  /** Mark data as stale and trigger refetch */
  invalidate(): void;
  /**
   * Abort any in-flight request. Called automatically on host disconnect.
   *
   * Optional so that other implementations of this structural interface —
   * loom-rpc's RpcQuery, for one — are not broken by its addition.
   */
  dispose?(): void;

  // ── LoomResult combinators ──

  /** Return data or throw the error */
  unwrap(): T;
  /** Return data or the fallback */
  unwrap_or(fallback: T): T;
  /** Transform the Ok value */
  map<U>(fn: (value: T) => U): import("../result").LoomResult<U, E>;
  /** Transform the Err value */
  map_err<F>(fn: (error: E) => F): import("../result").LoomResult<T, F>;
  /** Chain a fallible operation */
  and_then<U>(fn: (value: T) => import("../result").LoomResult<U, E>): import("../result").LoomResult<U, E>;
  /** Composable pattern match — extends base ok/err with optional `loading` branch */
  match<R>(cases: { ok: (data: T) => R; err: (error: E) => R; loading?: () => R; [_: string]: unknown }): R;
}

/** Options object form for @api */
export interface ApiOptions<T, El = any> {
  /**
   * The fetch function — receives the host element for parameterized queries,
   * and the interceptor context. Use `ctx.fetch()` if you rely on @intercept.
   */
  fn: (el: El, ctx: ApiCtx) => Promise<T>;
  /** Dynamic cache key — when it changes, abort + refetch. Receives the host element */
  key?: (el: El) => string;
  /** Named interceptors to run before fetch (like guards on @route) */
  use?: string[];
  /** Named interceptors to run after fetch — transform the response (e.g. `.json()`) */
  pipe?: string[];
  /** Milliseconds before data is considered stale (default: 0 = always stale) */
  staleTime?: number;
  /**
   * Revalidate in the background once `staleTime` has elapsed (default: true).
   *
   * This is the "while-revalidate" half of stale-while-revalidate: the cached
   * data stays on screen, `fetching` goes true, and the new data replaces it
   * when it lands. Set false to keep `.stale` as a flag you act on yourself.
   */
  revalidate?: boolean;
  /** Number of retries on failure with exponential backoff (default: 0) */
  retry?: number;
  /**
   * Gate the request. When this returns false nothing is fetched, and the
   * state sits at `loading: false` with no data rather than reporting a
   * request that never happened.
   *
   * Without it, an @api whose URL depends on a prop fires once before that
   * prop is set — a request for `/users/undefined` whose failure then has to
   * be explained away.
   *
   * ```ts
   * @api({
   *   fn: (el) => fetch(`/users/${el.userId}`).then((r) => r.json()),
   *   key: (el) => el.userId,
   *   enabled: (el) => Boolean(el.userId),
   * })
   * accessor user!: ApiState<User>;
   * ```
   */
  enabled?: (el: El) => boolean;
}
