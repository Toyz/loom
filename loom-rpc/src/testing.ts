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

export class MockTransport extends RpcTransport {
  private mocks = new Map<string, any>();
  private errors = new Map<string, Error>();
  private calls: Array<{ router: string; method: string; args: any[] }> = [];
  private delays = new Map<string, number>();

  /** Register a mock response for a specific router.method */
  mock<T>(router: string, method: string, response: T): this {
    this.mocks.set(`${router}.${method}`, response);
    return this;
  }

  /** Register a mock error for a specific router.method */
  mockError(router: string, method: string, error: Error): this {
    this.errors.set(`${router}.${method}`, error);
    return this;
  }

  /** Add an artificial delay (ms) for a specific router.method */
  delay(router: string, method: string, ms: number): this {
    this.delays.set(`${router}.${method}`, ms);
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
  assertCalled(router: string, method: string, args?: any[]): void {
    const match = this.calls.find(
      (c) => c.router === router && c.method === method &&
        (args === undefined || JSON.stringify(c.args) === JSON.stringify(args)),
    );
    if (!match) {
      throw new Error(
        `Expected ${router}.${method}(${args ? JSON.stringify(args) : "..."}) to have been called. ` +
        `Calls: ${JSON.stringify(this.calls)}`,
      );
    }
  }

  /** Assert a specific call was NOT made */
  assertNotCalled(router: string, method: string): void {
    const match = this.calls.find(
      (c) => c.router === router && c.method === method,
    );
    if (match) {
      throw new Error(
        `Expected ${router}.${method} to NOT have been called, but it was.`,
      );
    }
  }

  async call<T>(router: string, method: string, args: any[]): Promise<T> {
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
      `Register one with: transport.mock("${router}", "${method}", responseData)`,
    );
  }
}
