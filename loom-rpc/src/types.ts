/**
 * LoomRPC — Type utilities
 *
 * Extract method names, parameter types, and return types from contract classes.
 * Powers the type-safe @rpc and @mutate decorators.
 */
import type { ApiState } from "@toyz/loom/query";

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
 * Configuration for @stream decorator.
 */
export interface RpcStreamOptions<TRouter, TMethod extends RpcMethods<TRouter>> {
  /** Extract procedure args from element/service state. Called once when the stream opens. */
  fn?: (el: any) => InferArgs<TRouter, TMethod>;
  /**
   * Whether to open the stream automatically when the element connects.
   * When false, call `stream.open()` manually to start receiving events.
   * Default: true
   */
  eager?: boolean;
}

/**
 * State container for a server-push stream.
 *
 * Implements `AsyncIterable<T>` so you can iterate directly:
 * ```ts
 * for await (const msg of this.chatMessages) { ... }
 * ```
 * Or use `.events` for the same iterable, or `.open()` + `@onStream` for
 * component-level callback wiring.
 */
export interface RpcStream<T> extends AsyncIterable<T> {
  /** Current state of the stream connection */
  readonly status: "idle" | "streaming" | "error" | "closed";
  /** Error if status === "error", otherwise null */
  readonly error: Error | null;
  /**
   * Open the stream and start pumping events to `@onStream` callbacks.
   * Called automatically on connect when `eager: true` (the default).
   * Call manually when `eager: false`.
   */
  open(): void;
  /** Close the stream and release the connection */
  close(): void;
  /**
   * Named alias for `[Symbol.asyncIterator]()` — same iterable, explicit name.
   * Prefer iterating the stream directly (`for await (const x of stream)`)
   * unless you need to hold a reference to the iterable separately.
   */
  readonly events: AsyncIterable<T>;
  /** Required by AsyncIterable — delegates to .events */
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

/**
 * State container for a query — auto-fetched, reactive, with SWR.
 * Extends ApiState for backwards compatibility.
 *
 * ```ts
 * @rpc(UserRouter, "getUser", { fn: el => [el.userId] })
 * accessor user!: RpcQuery<[string], User>;
 * ```
 */
export interface RpcQuery<TArgs extends any[], TReturn> extends ApiState<TReturn> {
  // Resolved by the RpcTransport via .call() — see rpc.ts for state shape
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
