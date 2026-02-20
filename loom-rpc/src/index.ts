/**
 * LoomRPC — Barrel exports
 *
 * Type-safe, decorator-driven RPC for Loom.
 * Server-agnostic, transport-swappable.
 */

// Decorators
export { rpc } from "./rpc";
export { mutate } from "./mutate";

// Transport
export { RpcTransport, HttpTransport, RpcError } from "./transport";

// Types
export type {
  RpcMethods,
  InferArgs,
  InferReturn,
  RpcQueryOptions,
  RpcMutator,
  RpcRequest,
  RpcResponse,
} from "./types";
