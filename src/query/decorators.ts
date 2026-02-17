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
import { createApiState } from "./state";
import { interceptRegistry } from "./registry";

// Re-export for barrel
export { interceptRegistry } from "./registry";



// ── @intercept (method decorator via createDecorator) ──

/**
 * Mark a method as a named API interceptor.
 *
 * Interceptors receive a mutable ApiCtx and can modify url, headers, params, init.
 * Return false to block the request (same as @guard).
 * Name defaults to the method name if not provided (same as @guard).
 *
 * ```ts
 * @intercept()
 * auth(ctx: ApiCtx, @inject(TokenStore) t: TokenStore) {
 *   ctx.headers["Authorization"] = `Bearer ${t.jwt}`;
 * }
 * ```
 */
export const intercept = createDecorator<[name?: string]>(
  (method, key, name) => {
    const interceptName = name ?? key;
    interceptRegistry.set(interceptName, { method, key });
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

    const opts: ApiOptions<T> =
      typeof fnOrOpts === "function" ? { fn: fnOrOpts } : fnOrOpts;

    return {
      get(this: any): ApiState<T> {
        if (!this[stateKey]) {
          const scheduleUpdate = () => this.scheduleUpdate?.();
          this[stateKey] = createApiState<T>(opts, scheduleUpdate, this);
        }
        return this[stateKey];
      },
      set(this: any, _val: ApiState<T>) {
        // Ignore external sets — state is managed internally
      },
    };
  };
}
