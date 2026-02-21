/**
 * LoomRPC — @rpc query decorator
 *
 * Auto-accessor decorator for type-safe RPC queries.
 * Reuses Loom's ApiState pattern under the hood.
 *
 * ```ts
 * @rpc(UserRouter, "getUser", {
 *   fn: el => [el.userId],
 *   staleTime: 60_000,
 * })
 * accessor user!: ApiState<User>;
 * ```
 *
 * The contract class is passed as a runtime value (not just a type)
 * so the router name survives TypeScript erasure.
 */

import { app, createSymbol } from "@toyz/loom";
import type { ApiState } from "@toyz/loom";
import { Reactive } from "@toyz/loom/store";
import { LoomResult } from "@toyz/loom";
import type { RpcMethods, InferReturn, RpcQueryOptions } from "./types";
import { RpcTransport } from "./transport";

import { resolveServiceName } from "./service";

/** Symbol for inspect() introspection */
export const RPC_QUERIES = createSymbol("rpc:queries");

/**
 * @rpc(Router, method, opts?) — Query decorator
 *
 * Fetches data from the server via the registered RpcTransport.
 * Returns an ApiState<T> with .match(), .unwrap(), .refetch(), etc.
 *
 * ```ts
 * @rpc(UserRouter, "getUser", { fn: el => [el.userId], staleTime: 60_000 })
 * accessor user!: ApiState<User>;
 * ```
 *
 * @param router - The contract class (used for router name + type inference)
 * @param method - The method name on the contract to call
 * @param opts - Optional configuration (fn, staleTime, retry, eager)
 */
export function rpc<
  TRouter extends object,
  TMethod extends RpcMethods<TRouter>,
>(
  router: new (...args: any[]) => TRouter,
  method: TMethod,
  opts?: RpcQueryOptions<TRouter, TMethod>,
) {
  type TReturn = InferReturn<TRouter, TMethod>;
  const routerName = resolveServiceName(router);

  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, ApiState<TReturn>>,
    context: ClassAccessorDecoratorContext<This, ApiState<TReturn>>,
  ): ClassAccessorDecoratorResult<This, ApiState<TReturn>> => {
    const stateKey = Symbol(`rpc:${String(context.name)}`);
    const traceKey = Symbol(`rpc:trace:${String(context.name)}`);
    const accessorName = String(context.name);

    context.addInitializer(function (this: any) {
      const ctor = this.constructor;
      ctor[RPC_QUERIES] ??= [];
      ctor[RPC_QUERIES].push({ accessor: accessorName, router: routerName, method: String(method) });
    });

    return {
      get(this: any): ApiState<TReturn> {
        if (!this[stateKey]) {
          const sentinel = new Reactive(0);
          this[traceKey] = sentinel;
          sentinel.subscribe(() => this.scheduleUpdate?.());
          const notify = () => { sentinel.set((v: number) => v + 1); };

          this[stateKey] = createRpcState<TRouter, TMethod, TReturn>(
            routerName,
            method,
            opts,
            notify,
            this,
          );
        }
        // Read sentinel so traced update() sees the dependency
        (this[traceKey] as Reactive<number>).value;
        return this[stateKey];
      },
      set(this: any, _val: ApiState<TReturn>) {
        // State is managed internally
      },
    };
  };
}

/**
 * Internal state factory — mirrors createApiState but uses RpcTransport.
 */
function createRpcState<TRouter, TMethod extends RpcMethods<TRouter>, TReturn>(
  routerName: string,
  method: TMethod,
  opts: RpcQueryOptions<TRouter, TMethod> | undefined,
  scheduleUpdate: () => void,
  host: any,
): ApiState<TReturn> {
  let data: TReturn | undefined;
  let error: Error | undefined;
  let loading = true;
  let stale = false;
  let lastFetchTime = 0;
  let lastArgs: string | undefined;
  let fetching = false;

  const staleTime = opts?.staleTime ?? 0;
  const maxRetries = opts?.retry ?? 0;
  const eager = opts?.eager ?? true;

  async function runFetch(): Promise<void> {
    let transport: RpcTransport;
    try {
      transport = app.get(RpcTransport);
    } catch {
      error = new Error(
        "[LoomRPC] No RpcTransport registered. " +
        "Call app.use(RpcTransport, new HttpTransport()) before app.start()."
      );
      loading = false;
      scheduleUpdate();
      return;
    }

    // Resolve args from element state
    const args: any[] = opts?.fn ? opts.fn(host) as any[] : [];

    // Check if args changed (SWR key)
    const argsKey = JSON.stringify(args);
    if (argsKey === lastArgs && !stale && data !== undefined && !fetching) {
      return; // Same args, data is fresh — skip
    }
    lastArgs = argsKey;

    loading = data === undefined; // SWR: only show loading if no cached data
    error = undefined;
    stale = false;
    fetching = true;
    scheduleUpdate();

    let attempt = 0;
    while (true) {
      try {
        data = await transport.call<TReturn>(routerName, method as string, args);
        error = undefined;
        loading = false;
        fetching = false;
        lastFetchTime = Date.now();
        scheduleUpdate();
        return;
      } catch (e) {
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

  function checkStale(): void {
    if (staleTime > 0 && lastFetchTime > 0 && !stale) {
      if (Date.now() - lastFetchTime > staleTime) {
        stale = true;
      }
    }
  }

  const state: ApiState<TReturn> = {
    get ok() {
      return data !== undefined && error === undefined;
    },
    get data() {
      checkStale();
      // Re-derive args and refetch if they changed
      if (opts?.fn) {
        const newArgs = JSON.stringify(opts.fn(host) as any[]);
        if (newArgs !== lastArgs) {
          runFetch();
        }
      }
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
      lastArgs = undefined; // Force refetch
      await runFetch();
    },
    invalidate() {
      stale = true;
      lastArgs = undefined;
      runFetch();
    },

    // ── LoomResult combinators ──

    unwrap(): TReturn {
      if (data !== undefined && error === undefined) return data;
      throw error ?? new Error("unwrap() called on loading RPC state");
    },
    unwrap_or(fallback: TReturn): TReturn {
      return (data !== undefined && error === undefined) ? data : fallback;
    },
    map<U>(fn: (value: TReturn) => U): LoomResult<U, Error> {
      if (data !== undefined && error === undefined) return LoomResult.ok(fn(data));
      return LoomResult.err(error ?? new Error("No data"));
    },
    map_err<F>(fn: (e: Error) => F): LoomResult<TReturn, F> {
      if (data !== undefined && error === undefined) return LoomResult.ok(data);
      return LoomResult.err(fn(error ?? new Error("No data")));
    },
    and_then<U>(fn: (value: TReturn) => LoomResult<U, Error>): LoomResult<U, Error> {
      if (data !== undefined && error === undefined) return fn(data);
      return LoomResult.err(error ?? new Error("No data"));
    },
    match<R>(cases: { ok: (data: TReturn) => R; err: (error: Error) => R; loading?: () => R; [_: string]: unknown }): R {
      if (loading && data === undefined && error === undefined && cases.loading) {
        return cases.loading();
      }
      return (data !== undefined && error === undefined)
        ? cases.ok(data)
        : cases.err(error ?? new Error("No data"));
    },
  };

  // Fire initial fetch if eager
  if (eager) {
    runFetch();
  }

  return state;
}
