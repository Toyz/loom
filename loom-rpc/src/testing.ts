/**
 * LoomRPC — MockTransport for testing
 *
 * Drop-in RpcTransport replacement that returns pre-configured responses.
 * No network. No server. Just mocks.
 *
 * ```ts
 * import { MockTransport } from "@toyz/loom-rpc/testing";
 *
 * const transport = new MockTransport();
 * transport.mock("UserRouter", "getUser", { id: "1", name: "Test" });
 * transport.mockError("UserRouter", "deleteUser", new Error("Forbidden"));
 *
 * app.provide(RpcTransport, transport);
 * ```
 */

import { RpcTransport } from "./transport";
import { resolveServiceName } from "./service";

type RouterIdent = string | (new (...args: any[]) => any);

export class MockTransport extends RpcTransport {
  private mocks = new Map<string, any>();
  private errors = new Map<string, Error>();
  private calls: Array<{ router: string; method: string; args: any[] }> = [];
  private delays = new Map<string, number>();

  private getRouterName(router: RouterIdent): string {
    return typeof router === "string" ? router : resolveServiceName(router);
  }

  /** Register a mock response for a specific router.method */
  mock<T>(router: RouterIdent, method: string, response: T): this {
    this.mocks.set(`${this.getRouterName(router)}.${method}`, response);
    return this;
  }

  /** Register a mock error for a specific router.method */
  mockError(router: RouterIdent, method: string, error: Error): this {
    this.errors.set(`${this.getRouterName(router)}.${method}`, error);
    return this;
  }

  /** Add an artificial delay (ms) for a specific router.method */
  delay(router: RouterIdent, method: string, ms: number): this {
    this.delays.set(`${this.getRouterName(router)}.${method}`, ms);
    return this;
  }

  /** All calls that have been made through this transport */
  get history() {
    return this.calls;
  }

  /** Clear all mocks and call history */
  reset(): void {
    this.mocks.clear();
    this.errors.clear();
    this.calls.length = 0;
    this.delays.clear();
  }

  /** Assert a specific call was made */
  assertCalled(router: RouterIdent, method: string, args?: any[]): void {
    const rName = this.getRouterName(router);
    const match = this.calls.find(
      (c) => c.router === rName && c.method === method &&
        (args === undefined || JSON.stringify(c.args) === JSON.stringify(args)),
    );
    if (!match) {
      throw new Error(
        `Expected ${rName}.${method}(${args ? JSON.stringify(args) : "..."}) to have been called. ` +
        `Calls: ${JSON.stringify(this.calls)}`,
      );
    }
  }

  /** Assert a specific call was NOT made */
  assertNotCalled(router: RouterIdent, method: string): void {
    const rName = this.getRouterName(router);
    const match = this.calls.find(
      (c) => c.router === rName && c.method === method,
    );
    if (match) {
      throw new Error(
        `Expected ${rName}.${method} to NOT have been called, but it was.`,
      );
    }
  }

  async call<T>(router: string, method: string, args: any[], _signal?: AbortSignal): Promise<T> {
    this.calls.push({ router, method, args });
    const key = `${router}.${method}`;

    // Simulate network delay if configured
    const delayMs = this.delays.get(key);
    if (delayMs) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Check for mock error first
    const err = this.errors.get(key);
    if (err) throw err;

    // Check for mock response
    if (this.mocks.has(key)) {
      const value = this.mocks.get(key);
      // If it's a function, call it with args (dynamic mocks)
      return typeof value === "function" ? value(...args) : value;
    }

    throw new Error(
      `[MockTransport] No mock registered for ${key}. ` +
      `Register one with: transport.mock(RouterClass, "${method}", responseData)`
    );
  }
}
