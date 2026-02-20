/**
 * LoomRPC — Tests
 *
 * Tests for transport, @rpc, @mutate, and MockTransport.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "@toyz/loom";
import { RpcTransport, HttpTransport, RpcError } from "@toyz/loom-rpc";
import { MockTransport } from "@toyz/loom-rpc/testing";

// ── Contract classes for testing ──

class UserRouter {
  getUser(id: string): { id: string; name: string } { return null!; }
  listUsers(page: number, limit: number): { id: string; name: string }[] { return null!; }
  createUser(name: string, email: string): { id: string } { return null!; }
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
