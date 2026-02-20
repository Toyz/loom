/**
 * LoomRPC — @mutate mutation decorator
 *
 * Auto-accessor decorator for type-safe RPC mutations.
 * Unlike @rpc (queries), mutations are not auto-fetched —
 * you call them manually via .call().
 *
 * ```ts
 * @mutate(UserRouter, "updateProfile")
 * accessor save!: RpcMutator<[ProfileUpdate], User>;
 * ```
 */

import { app } from "@toyz/loom";
import { Reactive } from "@toyz/loom/store";
import type { RpcMethods, InferArgs, InferReturn, RpcMutator } from "./types";
import { RpcTransport } from "./transport";

import { resolveServiceName } from "./service";

/**
 * @mutate(Router, method) — Mutation decorator
 *
 * Returns an RpcMutator with .call(), .loading, .error, .data.
 *
 * ```ts
 * @mutate(UserRouter, "updateProfile")
 * accessor save!: RpcMutator<[ProfileUpdate], User>;
 *
 * // In a handler:
 * const result = await this.save.call({ name: "New Name" });
 * ```
 *
 * @param router - The contract class (used for router name + type inference)
 * @param method - The method name on the contract to call
 */
export function mutate<
  TRouter extends object,
  TMethod extends RpcMethods<TRouter>,
>(
  router: new (...args: any[]) => TRouter,
  method: TMethod,
) {
  type TArgs = InferArgs<TRouter, TMethod>;
  type TReturn = InferReturn<TRouter, TMethod>;
  const routerName = resolveServiceName(router);

  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, RpcMutator<TArgs extends any[] ? TArgs : [TArgs], TReturn>>,
    context: ClassAccessorDecoratorContext<This, RpcMutator<TArgs extends any[] ? TArgs : [TArgs], TReturn>>,
  ): ClassAccessorDecoratorResult<This, RpcMutator<TArgs extends any[] ? TArgs : [TArgs], TReturn>> => {
    const stateKey = Symbol(`mutate:${String(context.name)}`);
    const traceKey = Symbol(`mutate:trace:${String(context.name)}`);

    return {
      get(this: any): RpcMutator<TArgs extends any[] ? TArgs : [TArgs], TReturn> {
        if (!this[stateKey]) {
          const sentinel = new Reactive(0);
          this[traceKey] = sentinel;
          sentinel.subscribe(() => this.scheduleUpdate?.());
          const notify = () => { sentinel.set((v: number) => v + 1); };

          this[stateKey] = createMutator<TReturn>(
            routerName,
            method as string,
            notify,
          );
        }
        // Read sentinel so traced update() sees the dependency
        (this[traceKey] as Reactive<number>).value;
        return this[stateKey];
      },
      set(this: any, _val: RpcMutator<TArgs extends any[] ? TArgs : [TArgs], TReturn>) {
        // State is managed internally
      },
    };
  };
}

/**
 * Internal mutator factory.
 */
function createMutator<TReturn>(
  routerName: string,
  method: string,
  scheduleUpdate: () => void,
): RpcMutator<any[], TReturn> {
  let data: TReturn | undefined;
  let error: Error | null = null;
  let loading = false;

  return {
    async call(...args: any[]): Promise<TReturn> {
      let transport: RpcTransport;
      try {
        transport = app.get(RpcTransport);
      } catch {
        throw new Error(
          "[LoomRPC] No RpcTransport registered. " +
          "Call app.use(RpcTransport, new HttpTransport()) before app.start()."
        );
      }

      loading = true;
      error = null;
      scheduleUpdate();

      try {
        data = await transport.call<TReturn>(routerName, method, args);
        loading = false;
        error = null;
        scheduleUpdate();
        return data;
      } catch (e) {
        loading = false;
        error = e instanceof Error ? e : new Error(String(e));
        scheduleUpdate();
        throw error;
      }
    },

    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get data() {
      return data;
    },
    reset() {
      data = undefined;
      error = null;
      loading = false;
      scheduleUpdate();
    },
  };
}
