/**
 * LoomRPC — Barrel exports
 *
 * Type-safe, decorator-driven RPC for Loom.
 * Server-agnostic, transport-swappable.
 */

// Decorators
export { rpc } from "./rpc.js";
export { mutate } from "./mutate.js";
export { stream, onStream, RPC_STREAMS } from "./stream.js";
export { service, SERVICE_NAME } from "./service.js";

// Transport
export { RpcTransport, HttpTransport, RpcError } from "./transport.js";

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
} from "./types.js";

