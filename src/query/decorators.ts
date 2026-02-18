/**
 * Loom — @api + @intercept decorators
 *
 * @api<T>(fn | opts) — auto-accessor decorator for async data fetching.
 * @intercept(name?)  — method decorator for named request interceptors.
 *
 * Models interceptors after @guard: named, globally registered, DI-aware.
 */

import { createDecorator } from "../decorators/create";
import type { ApiState, ApiOptions, InterceptRegistration } from "./types";
import { Reactive } from "../store/reactive";
import { createApiState } from "./state";
import { interceptRegistry } from "./registry";

// Re-export for barrel
export { interceptRegistry } from "./registry";



// ── @intercept (method decorator via createDecorator) ──

/** Options for @intercept */
export interface InterceptOptions {
  name?: string;
  /** When true, runs after the fetch (response transformer) instead of before */
  after?: boolean;
}

/**
 * Mark a method as a named API interceptor.
 *
 * Interceptors receive a mutable ApiCtx and can modify url, headers, params, init.
 * Return false to block the request (same as @guard).
 * Name defaults to the method name if not provided (same as @guard).
 *
 * Pre-fetch (default):
 * ```ts
 * @intercept()
 * auth(ctx: ApiCtx) { ctx.headers["Authorization"] = `Bearer ${jwt}`; }
 * ```
 *
 * Post-fetch (response transformer):
 * ```ts
 * @intercept({ after: true })
 * json(ctx: ApiCtx) { return ctx.response!.json(); }
 * ```
 */
export const intercept = createDecorator<[nameOrOpts?: string | InterceptOptions]>(
  (method, key, nameOrOpts) => {
    const opts = typeof nameOrOpts === "string" ? { name: nameOrOpts } : (nameOrOpts ?? {});
    const interceptName = opts.name ?? key;
    interceptRegistry.set(interceptName, { method, key, after: opts.after });
  },
);

// ── @api (auto-accessor decorator) ──

/**
 * @api<T>(fn | opts) — Auto-accessor decorator for async data fetching.
 *
 * Simple form:
 * ```ts
 * @api<User>(() => fetch("/api/me").then(r => r.json()))
 * accessor user!: ApiState<User>;
 * ```
 *
 * Options form:
 * ```ts
 * @api<Post>({
 *   fn: (el) => fetch(`/api/posts/${el.postId}`).then(r => r.json()),
 *   key: (el) => `/api/posts/${el.postId}`,
 *   use: ["auth", "json"],
 *   staleTime: 30_000,
 *   retry: 3,
 * })
 * accessor post!: ApiState<Post>;
 * ```
 */
export function api<T extends object>(
  fnOrOpts: ((el?: any) => Promise<T>) | ApiOptions<T>,
) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, ApiState<T>>,
    context: ClassAccessorDecoratorContext<This, ApiState<T>>,
  ): ClassAccessorDecoratorResult<This, ApiState<T>> => {
    const stateKey = Symbol(`api:${String(context.name)}`);
    const traceKey = Symbol(`api:trace:${String(context.name)}`);

    const opts: ApiOptions<T> =
      typeof fnOrOpts === "function" ? { fn: fnOrOpts } : fnOrOpts;

    return {
      get(this: any): ApiState<T> {
        if (!this[stateKey]) {
          // Sentinel Reactive for trace integration — notified on every state change
          const sentinel = new Reactive(0);
          this[traceKey] = sentinel;
          sentinel.subscribe(() => this.scheduleUpdate?.());
          const notify = () => { sentinel.set((v: number) => v + 1); };
          this[stateKey] = createApiState<T>(opts, notify, this, String(context.name));
        }
        // Read sentinel.value so recordRead() fires during traced update()
        (this[traceKey] as Reactive<number>).value;
        return this[stateKey];
      },
      set(this: any, _val: ApiState<T>) {
        // Ignore external sets — state is managed internally
      },
    };
  };
}
