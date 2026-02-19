/**
 * Loom — LoomResult<T, E>
 *
 * Rust-inspired Result type for explicit error handling.
 * Used throughout the framework (@api, @form, DI, @guard)
 * and available as a public utility.
 *
 * ```ts
 * const r = LoomResult.ok(42);
 * r.match({
 *   ok:  (v) => console.log("got", v),
 *   err: (e) => console.error(e),
 * });
 * ```
 */

export class LoomResult<T, E = Error> {
  readonly ok: boolean;
  readonly data: T | undefined;
  readonly error: E | undefined;

  private constructor(ok: boolean, data: T | undefined, error: E | undefined) {
    this.ok = ok;
    this.data = data;
    this.error = error;
  }

  /** Alias for `data` — ergonomic access to the Ok value. */
  get value(): T | undefined {
    return this.data;
  }

  // ── Static constructors ──

  /** Create an Ok result wrapping `data`. */
  static ok<T>(data: T): LoomResult<T, never>;
  /** Create a void Ok result (no data). */
  static ok(): LoomResult<void, never>;
  static ok<T>(data?: T): LoomResult<T, never> {
    return new LoomResult<T, never>(true, data as T, undefined);
  }

  /** Create an Err result wrapping `error`. */
  static err<E>(error: E): LoomResult<never, E> {
    return new LoomResult<never, E>(false, undefined, error);
  }

  /** Pre-allocated void Ok — use for `LoomResult<void>` returns. */
  static readonly OK: LoomResult<void, never> = LoomResult.ok();

  /**
   * Wrap a Promise into a LoomResult — resolves to Ok, rejects to Err.
   *
   * ```ts
   * const r = await LoomResult.fromPromise(fetch("/api/data"));
   * r.match({ ok: (res) => ..., err: (e) => ... });
   * ```
   */
  static async fromPromise<T, E = Error>(promise: Promise<T>): Promise<LoomResult<T, E>> {
    try {
      return LoomResult.ok(await promise);
    } catch (err) {
      return LoomResult.err(err as E);
    }
  }

  // ── Combinators ──

  /**
   * Return the contained data, or throw if this is an Err.
   * @throws The contained error
   */
  unwrap(): T {
    if (this.ok) return this.data as T;
    throw this.error;
  }

  /**
   * Return the contained data, or `fallback` if this is an Err.
   */
  unwrap_or(fallback: T): T {
    return this.ok ? (this.data as T) : fallback;
  }

  /**
   * Transform the Ok value. Err passes through unchanged.
   */
  map<U>(fn: (value: T) => U): LoomResult<U, E> {
    if (this.ok) return LoomResult.ok(fn(this.data as T));
    return this as unknown as LoomResult<U, E>;
  }

  /**
   * Transform the Err value. Ok passes through unchanged.
   */
  map_err<F>(fn: (error: E) => F): LoomResult<T, F> {
    if (!this.ok) return LoomResult.err(fn(this.error as E));
    return this as unknown as LoomResult<T, F>;
  }

  /**
   * Chain a fallible operation. Only runs `fn` on Ok.
   */
  and_then<U>(fn: (value: T) => LoomResult<U, E>): LoomResult<U, E> {
    if (this.ok) return fn(this.data as T);
    return this as unknown as LoomResult<U, E>;
  }

  /**
   * Composable pattern match — `ok` and `err` are always required,
   * extra optional branches are accepted for specializations.
   *
   * The base implementation handles `ok`/`err` and ignores extras.
   * Types that compose on top (e.g. `ApiState`) intercept their
   * own branches before falling through to the base contract.
   *
   * ```ts
   * // Base — ok + err
   * result.match({
   *   ok:  (data)  => render(data),
   *   err: (error) => showError(error),
   * });
   *
   * // Extended — ApiState adds loading
   * this.team.match({
   *   loading: () => <Skeleton />,
   *   ok:  (team) => <TeamGrid members={team} />,
   *   err: (e)    => <ErrorCard message={e.message} />,
   * });
   * ```
   */
  match<R>(cases: { ok: (data: T) => R; err: (error: E) => R; [_: string]: unknown }): R {
    return this.ok
      ? cases.ok(this.data as T)
      : cases.err(this.error as E);
  }
}
