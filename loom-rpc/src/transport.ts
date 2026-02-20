/**
 * LoomRPC — Transport layer
 *
 * RpcTransport is the interface for how @rpc talks to the server.
 * HttpTransport is the default implementation — plain fetch to
 * POST /rpc/{router}/{method}.
 *
 * Swap transports via Loom's DI container:
 *   app.provide(RpcTransport, new WsTransport(...));
 */

import type { RpcRequest, RpcResponse } from "./types";

/**
 * Abstract transport — implement this to control how RPC calls reach the server.
 *
 * Registered as a DI service via `app.provide(RpcTransport, impl)`.
 */
export abstract class RpcTransport {
  abstract call<T>(router: string, method: string, args: any[]): Promise<T>;
}

/**
 * Default HTTP transport — POST JSON to `/rpc/{router}/{method}`.
 *
 * ```ts
 * import { app } from "@toyz/loom";
 * import { RpcTransport, HttpTransport } from "@toyz/loom-rpc";
 *
 * app.provide(RpcTransport, new HttpTransport());
 * // or with a custom base URL:
 * app.provide(RpcTransport, new HttpTransport("https://api.example.com/rpc"));
 * ```
 */
export class HttpTransport extends RpcTransport {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(baseUrl = "/rpc", headers: Record<string, string> = {}) {
    super();
    // Strip trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.headers = headers;
  }

  async call<T>(router: string, method: string, args: any[]): Promise<T> {
    const url = `${this.baseUrl}/${router}/${method}`;
    const body: RpcRequest = { args };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new RpcError(
        `RPC ${router}.${method} failed: ${res.status} ${text}`,
        res.status,
        router,
        method,
      );
    }

    const envelope: RpcResponse<T> = await res.json();

    if (envelope.error) {
      throw new RpcError(
        envelope.error.message,
        undefined,
        router,
        method,
        envelope.error.code,
      );
    }

    return envelope.data as T;
  }
}

/**
 * Structured error from an RPC call.
 */
export class RpcError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly router?: string,
    public readonly method?: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "RpcError";
  }
}
