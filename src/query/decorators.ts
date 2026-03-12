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
import type { Schedulable } from "../element/element";
import { WATCHERS, localSymbol } from "../decorators/symbols";

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
  fnOrOpts: ((el?: object) => Promise<T>) | ApiOptions<T>,
) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, ApiState<T>>,
    context: ClassAccessorDecoratorContext<This, ApiState<T>>,
  ): ClassAccessorDecoratorResult<This, ApiState<T>> => {
    const state_ = localSymbol<ApiState<T>>(`api:${String(context.name)}`);
    const trace_ = localSymbol<Reactive<number>>(`api:trace:${String(context.name)}`);

    const opts: ApiOptions<T> =
      typeof fnOrOpts === "function" ? { fn: fnOrOpts } : fnOrOpts;

    return {
      get(this: This): ApiState<T> {
        const self = this as unknown as Record<symbol, unknown> & Record<string, unknown>;
        if (!self[state_.key]) {
          // Sentinel Reactive for trace integration — notified on every state change
          const sentinel = new Reactive(0);
          self[trace_.key] = sentinel;
          sentinel.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());
          const notify = () => { sentinel.set((v: number) => v + 1); };
          self[state_.key] = createApiState<T>(opts, notify, self, String(context.name));

          // Wire @watch handlers for this accessor
          const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
          if (watchers) {
            for (const w of watchers) {
              if (w.field === String(context.name)) {
                sentinel.subscribe(() => (self[w.key] as Function)(self[state_.key], undefined));
              }
            }
          }
        }
        // Read sentinel.value so recordRead() fires during traced update()
        (self[trace_.key] as Reactive<number>).value;
        return self[state_.key] as ApiState<T>;
      },
      set(this: This, _val: ApiState<T>) {
        // Ignore external sets — state is managed internally
      },
    };
  };
}
