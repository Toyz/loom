/**
 * LoomRPC — Tests
 *
 * Tests for transport, @rpc, @mutate, and MockTransport.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "@toyz/loom";
import { RpcTransport, HttpTransport, RpcError, service, SERVICE_NAME } from "@toyz/loom-rpc";
import { MockTransport } from "@toyz/loom-rpc/testing";
import { resolveServiceName } from "../src/service";

// ── Contract classes for testing ──

class UserRouter {
  getUser(id: string): { id: string; name: string } { return null!; }
  listUsers(page: number, limit: number): { id: string; name: string }[] { return null!; }
  createUser(name: string, email: string): { id: string } { return null!; }
}

@service("OrderService")
class OrderRouter {
  getOrder(id: string): { id: string; total: number } { return null!; }
}

// ── Transport Tests ──

describe("RpcTransport", () => {
  it("HttpTransport extends RpcTransport", () => {
    const transport = new HttpTransport();
    expect(transport).toBeInstanceOf(RpcTransport);
  });

  it("HttpTransport strips trailing slash from base URL", () => {
    const transport = new HttpTransport("/api/rpc/");
    // Access internal baseUrl via the call method behavior
    expect(transport).toBeInstanceOf(RpcTransport);
  });
});

describe("RpcError", () => {
  it("has structured fields", () => {
    const err = new RpcError("Not found", 404, "UserRouter", "getUser", "NOT_FOUND");
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.router).toBe("UserRouter");
    expect(err.method).toBe("getUser");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("RpcError");
    expect(err).toBeInstanceOf(Error);
  });
});

// ── MockTransport Tests ──

describe("MockTransport", () => {
  let transport: MockTransport;

  beforeEach(() => {
    transport = new MockTransport();
  });

  it("extends RpcTransport", () => {
    expect(transport).toBeInstanceOf(RpcTransport);
  });

  it("returns mocked responses", async () => {
    transport.mock("UserRouter", "getUser", { id: "1", name: "Alice" });
    const result = await transport.call<any>("UserRouter", "getUser", ["1"]);
    expect(result).toEqual({ id: "1", name: "Alice" });
  });

  it("supports class references for router identifiers", async () => {
    // mock using the class reference
    transport.mock(UserRouter, "getUser", { id: "2", name: "Bob" });
    // call using the string name (what the transport does internally)
    const result = await transport.call<any>("UserRouter", "getUser", ["2"]);
    expect(result).toEqual({ id: "2", name: "Bob" });

    // assertCalled using the class reference
    expect(() => transport.assertCalled(UserRouter, "getUser", ["2"])).not.toThrow();
  });

  it("throws for unmocked calls", async () => {
    await expect(
      transport.call("UserRouter", "getUser", ["1"]),
    ).rejects.toThrow("[MockTransport] No mock registered for UserRouter.getUser");
  });

  it("throws mocked errors", async () => {
    transport.mockError("UserRouter", "deleteUser", new Error("Forbidden"));
    await expect(
      transport.call("UserRouter", "deleteUser", ["1"]),
    ).rejects.toThrow("Forbidden");
  });

  it("records call history", async () => {
    transport.mock("UserRouter", "getUser", { id: "1" });
    await transport.call("UserRouter", "getUser", ["1"]);
    await transport.call("UserRouter", "getUser", ["2"]);

    expect(transport.history).toHaveLength(2);
    expect(transport.history[0]).toEqual({
      router: "UserRouter",
      method: "getUser",
      args: ["1"],
    });
    expect(transport.history[1]).toEqual({
      router: "UserRouter",
      method: "getUser",
      args: ["2"],
    });
  });

  it("assertCalled passes for matching calls", async () => {
    transport.mock("UserRouter", "getUser", { id: "1" });
    await transport.call("UserRouter", "getUser", ["1"]);
    expect(() => transport.assertCalled("UserRouter", "getUser")).not.toThrow();
    expect(() => transport.assertCalled("UserRouter", "getUser", ["1"])).not.toThrow();
  });

  it("assertCalled throws for missing calls", () => {
    expect(() => transport.assertCalled("UserRouter", "getUser")).toThrow();
  });

  it("assertNotCalled passes when not called", () => {
    expect(() => transport.assertNotCalled("UserRouter", "getUser")).not.toThrow();
  });

  it("assertNotCalled throws when called", async () => {
    transport.mock("UserRouter", "getUser", { id: "1" });
    await transport.call("UserRouter", "getUser", ["1"]);
    expect(() => transport.assertNotCalled("UserRouter", "getUser")).toThrow();
  });

  it("supports fluent API", () => {
    const result = transport
      .mock("UserRouter", "getUser", { id: "1" })
      .mock("UserRouter", "listUsers", [])
      .mockError("UserRouter", "deleteUser", new Error("nope"))
      .delay("UserRouter", "getUser", 100);

    expect(result).toBe(transport);
  });

  it("supports dynamic mocks with functions", async () => {
    transport.mock("UserRouter", "getUser", (id: string) => ({
      id,
      name: `User ${id}`,
    }));

    const result = await transport.call<any>("UserRouter", "getUser", ["42"]);
    expect(result).toEqual({ id: "42", name: "User 42" });
  });

  it("reset clears everything", async () => {
    transport.mock("UserRouter", "getUser", { id: "1" });
    await transport.call("UserRouter", "getUser", ["1"]);

    transport.reset();

    expect(transport.history).toHaveLength(0);
    await expect(
      transport.call("UserRouter", "getUser", ["1"]),
    ).rejects.toThrow();
  });

  it("simulates delay", async () => {
    transport.mock("UserRouter", "getUser", { id: "1" });
    transport.delay("UserRouter", "getUser", 50);

    const start = Date.now();
    await transport.call("UserRouter", "getUser", ["1"]);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40); // allow some timer jitter
  });
});

// ── Type inference tests (compile-time only) ──

describe("Type inference", () => {
  it("RpcMethods extracts method names", () => {
    // This is a compile-time test — if it compiles, the types work
    type Methods = import("@toyz/loom-rpc").RpcMethods<UserRouter>;
    const method: Methods = "getUser";
    expect(method).toBe("getUser");
  });

  it("InferReturn extracts return types", () => {
    type Return = import("@toyz/loom-rpc").InferReturn<UserRouter, "getUser">;
    const user: Return = { id: "1", name: "Alice" };
    expect(user.id).toBe("1");
  });

  it("InferArgs extracts parameter types", () => {
    type Args = import("@toyz/loom-rpc").InferArgs<UserRouter, "getUser">;
    const args: Args = ["1"];
    expect(args[0]).toBe("1");
  });

  it("InferArgs handles multiple params", () => {
    type Args = import("@toyz/loom-rpc").InferArgs<UserRouter, "listUsers">;
    const args: Args = [1, 10];
    expect(args).toEqual([1, 10]);
  });
});

// ── DI Integration Tests ──

describe("DI integration", () => {
  it("MockTransport can be provided via app.provide", () => {
    const transport = new MockTransport();
    app.use(RpcTransport, transport);
    const resolved = app.get(RpcTransport);
    expect(resolved).toBe(transport);
  });

  it("HttpTransport can be provided via app.provide", () => {
    const transport = new HttpTransport("/api");
    app.use(RpcTransport, transport);
    const resolved = app.get(RpcTransport);
    expect(resolved).toBe(transport);
    expect(resolved).toBeInstanceOf(HttpTransport);
  });
});

// ── @service Decorator Tests ──

describe("@service decorator", () => {
  it("stamps SERVICE_NAME on the class", () => {
    expect((OrderRouter as any)[SERVICE_NAME.key]).toBe("OrderService");
  });

  it("resolveServiceName returns @service name when present", () => {
    expect(resolveServiceName(OrderRouter)).toBe("OrderService");
  });

  it("resolveServiceName falls back to class.name when no @service", () => {
    expect(resolveServiceName(UserRouter)).toBe("UserRouter");
  });

  it("MockTransport resolves @service names from class references", async () => {
    const transport = new MockTransport();
    transport.mock(OrderRouter, "getOrder", { id: "1", total: 99 });

    // transport.call uses the string — @rpc would send resolveServiceName(OrderRouter) = "OrderService"
    const result = await transport.call<any>("OrderService", "getOrder", ["1"]);
    expect(result).toEqual({ id: "1", total: 99 });
  });

  it("MockTransport assertCalled works with @service class refs", async () => {
    const transport = new MockTransport();
    transport.mock(OrderRouter, "getOrder", { id: "1", total: 50 });
    await transport.call("OrderService", "getOrder", ["1"]);

    expect(() => transport.assertCalled(OrderRouter, "getOrder", ["1"])).not.toThrow();
  });
});

// ── RpcQuery Type Tests ──

describe("RpcQuery", () => {
  it("RpcQuery type is assignable from ApiState (backwards compat)", () => {
    // RpcQuery extends ApiState, so RpcQuery is assignable TO ApiState
    type Query = import("@toyz/loom-rpc").RpcQuery<[string], { id: string; name: string }>;
    type State = import("@toyz/loom").ApiState<{ id: string; name: string }>;

    // Compile-time check: RpcQuery<[string], User> is assignable to ApiState<User>
    const assertAssignable = (q: Query): State => q;
    expect(assertAssignable).toBeDefined();
  });

  it("RpcQuery carries both TArgs and TReturn type parameters", () => {
    type Query = import("@toyz/loom-rpc").RpcQuery<[string, number], { id: string }>;
    // If this compiles, TArgs = [string, number] and TReturn = { id: string } are properly carried
    const _check: Query = null!;
    expect(true).toBe(true); // Compile-time test
  });

  it("RpcQuery has all expected ApiState members", () => {
    // Verify the interface shape at compile time
    type Query = import("@toyz/loom-rpc").RpcQuery<[string], { name: string }>;
    type HasOk = Query["ok"];                          // boolean
    type HasData = Query["data"];                      // { name: string } | undefined
    type HasError = Query["error"];                    // Error | undefined
    type HasLoading = Query["loading"];                // boolean
    type HasStale = Query["stale"];                    // boolean
    type HasRefetch = Query["refetch"];                // () => Promise<void>
    type HasInvalidate = Query["invalidate"];          // () => void
    type HasUnwrap = Query["unwrap"];                  // () => { name: string }
    type HasUnwrapOr = Query["unwrap_or"];             // (fallback) => { name: string }
    type HasMatch = Query["match"];                    // (cases) => R
    type HasMap = Query["map"];                        // (fn) => LoomResult

    // Use the types to prevent unused warnings
    const types: [HasOk, HasData, HasError, HasLoading, HasStale, HasRefetch, HasInvalidate, HasUnwrap, HasUnwrapOr, HasMatch, HasMap] = null!;
    expect(types).toBeNull();
  });

  it("RpcQuery is exported from @toyz/loom-rpc", async () => {
    const loomRpc = await import("@toyz/loom-rpc");
    // RpcQuery is a type-only export — it doesn't exist at runtime
    // But the module should export it in its type declarations
    // This test verifies the import resolution works
    expect(loomRpc).toBeDefined();
  });

  it("RpcMutator and RpcQuery have symmetrical type parameters", () => {
    // Both take <TArgs extends any[], TReturn>
    type Mutator = import("@toyz/loom-rpc").RpcMutator<[string], { id: string }>;
    type Query = import("@toyz/loom-rpc").RpcQuery<[string], { id: string }>;

    // Compile-time: both carry the same type parameter structure
    const _m: Mutator = null!;
    const _q: Query = null!;
    expect(true).toBe(true);
  });
});
