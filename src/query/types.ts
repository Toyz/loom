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
  /** True during the initial fetch or refetch */
  readonly loading: boolean;
  /** True when staleTime has elapsed since last successful fetch */
  readonly stale: boolean;
  /** Manually re-execute the fetch */
  refetch(): Promise<void>;
  /** Mark data as stale and trigger refetch */
  invalidate(): void;

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
  /** The fetch function — receives the host element for parameterized queries */
  fn: (el: El) => Promise<T>;
  /** Dynamic cache key — when it changes, abort + refetch. Receives the host element */
  key?: (el: El) => string;
  /** Named interceptors to run before fetch (like guards on @route) */
  use?: string[];
  /** Named interceptors to run after fetch — transform the response (e.g. `.json()`) */
  pipe?: string[];
  /** Milliseconds before data is considered stale (default: 0 = always stale) */
  staleTime?: number;
  /** Number of retries on failure with exponential backoff (default: 0) */
  retry?: number;
}
