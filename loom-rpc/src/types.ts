/**
 * LoomRPC — Type utilities
 *
 * Extract method names, parameter types, and return types from contract classes.
 * Powers the type-safe @rpc and @mutate decorators.
 */

/**
 * Extract callable method names from a contract class.
 * Filters out non-function properties so only procedure names are valid.
 */
export type RpcMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T] & string;

/**
 * Extract the parameter types for a specific method on a contract class.
 *
 * ```ts
 * type Args = InferArgs<UserRouter, "getUser">; // [id: string]
 * ```
 */
export type InferArgs<T, M extends keyof T> =
  T[M] extends (...args: infer A) => any ? A : never;

/**
 * Extract the return type for a specific method on a contract class.
 * Unwraps Promise<T> to T automatically.
 *
 * ```ts
 * type Result = InferReturn<UserRouter, "getUser">; // User
 * ```
 */
export type InferReturn<T, M extends keyof T> =
  T[M] extends (...args: any[]) => Promise<infer R> ? R :
  T[M] extends (...args: any[]) => infer R ? R : never;

/**
 * Configuration for @rpc query decorator.
 */
export interface RpcQueryOptions<TRouter, TMethod extends RpcMethods<TRouter>> {
  /** Extract procedure args from element state. Re-evaluates on reactive changes. */
  fn?: (el: any) => InferArgs<TRouter, TMethod>;
  /** SWR cache duration in ms (default: 0 = always refetch) */
  staleTime?: number;
  /** Whether to fetch on connect (default: true) */
  eager?: boolean;
  /** Number of retries on failure with exponential backoff (default: 0) */
  retry?: number;
}

/**
 * State container for a mutation — manual `.call()`, tracks loading/error.
 */
export interface RpcMutator<TArgs extends any[], TReturn> {
  /** Execute the mutation with the given arguments */
  call(...args: TArgs): Promise<TReturn>;
  /** True while the mutation is in flight */
  readonly loading: boolean;
  /** Error from the last mutation attempt, or null */
  readonly error: Error | null;
  /** Data from the last successful mutation, or undefined */
  readonly data: TReturn | undefined;
  /** Reset the mutator state (clear data, error, loading) */
  reset(): void;
}

/**
 * Wire protocol envelope for RPC requests.
 */
export interface RpcRequest {
  args: any[];
}

/**
 * Wire protocol envelope for RPC responses.
 */
export interface RpcResponse<T = any> {
  data?: T;
  error?: { message: string; code?: string };
}
