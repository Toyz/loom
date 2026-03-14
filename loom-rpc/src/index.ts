/**
 * LoomRPC — Barrel exports
 *
 * Type-safe, decorator-driven RPC for Loom.
 * Server-agnostic, transport-swappable.
 */

// Decorators
export { rpc } from "./rpc";
export { mutate } from "./mutate";
export { stream, onStream, RPC_STREAMS } from "./stream";
export { service, SERVICE_NAME } from "./service";

// Transport
export { RpcTransport, HttpTransport, RpcError } from "./transport";

// Types
export type {
  RpcMethods,
  InferArgs,
  InferReturn,
  RpcQueryOptions,
  RpcStreamOptions,
  RpcMutator,
  RpcQuery,
  RpcStream,
  RpcRequest,
  RpcResponse,
} from "./types";

