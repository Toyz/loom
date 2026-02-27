/**
 * Tests: @guard receives RouteInfo as first argument
 *
 * Covers:
 *   - Guard receives RouteInfo (path, params, tag, meta)
 *   - Guard with no @inject still gets RouteInfo
 *   - Guard receives empty meta {} when route has no meta
 *   - Guard can redirect based on route.meta values
 *   - Guard gets group-inherited meta in RouteInfo
 *   - Prototype guards also receive RouteInfo
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { routes, matchRoute, guardRegistry } from "../src/router/route";
import { route, guard, group } from "../src/router/decorators";
import { LoomRouter, type RouteInfo } from "../src/router/router";

// Clear state between tests
beforeEach(() => {
  routes.length = 0;
  guardRegistry.clear();
});

// ── Helpers ──

/** Create a minimal router and expose _checkGuards via subclass */
class TestRouter extends LoomRouter {
  /** Expose the private _checkGuards for direct testing */
  checkGuards(path: string): Promise<boolean | string> {
    return (this as any)._checkGuards(path);
  }
}

// ── Guard receives RouteInfo ──

describe("@guard receives RouteInfo as first arg", () => {
  it("passes RouteInfo with meta to a named guard", async () => {
    let captured: RouteInfo | null = null;

    class Guards {
      @guard("role_check")
      checkRole(route: RouteInfo) {
        captured = route;
        return true;
      }
    }

    // Force the addInitializer to run
    const instance = new Guards();

    @route("/admin", { guards: ["role_check"], meta: { role: "admin", layout: "sidebar" } })
    class AdminPage {}

    const router = new TestRouter();
    const result = await router.checkGuards("/admin");

    expect(result).toBe(true);
    expect(captured).not.toBeNull();
    expect(captured!.path).toBe("/admin");
    expect(captured!.meta).toEqual({ role: "admin", layout: "sidebar" });
  });

  it("passes RouteInfo with empty meta when route has no meta", async () => {
    let captured: RouteInfo | null = null;

    class Guards {
      @guard("basic")
      check(route: RouteInfo) {
        captured = route;
        return true;
      }
    }
    const instance = new Guards();

    @route("/home", { guards: ["basic"] })
    class HomePage {}

    const router = new TestRouter();
    await router.checkGuards("/home");

    expect(captured).not.toBeNull();
    expect(captured!.meta).toEqual({});
    expect(captured!.path).toBe("/home");
  });

  it("passes RouteInfo with params", async () => {
    let captured: RouteInfo | null = null;

    class Guards {
      @guard("param_check")
      check(route: RouteInfo) {
        captured = route;
        return true;
      }
    }
    const instance = new Guards();

    @route("/user/:id", { guards: ["param_check"], meta: { requiresAuth: true } })
    class UserPage {}

    const router = new TestRouter();
    await router.checkGuards("/user/42");

    expect(captured).not.toBeNull();
    expect(captured!.path).toBe("/user/42");
    expect(captured!.params).toEqual({ id: "42" });
    expect(captured!.meta).toEqual({ requiresAuth: true });
  });

  it("guard can redirect based on meta", async () => {
    class Guards {
      @guard("admin_only")
      adminOnly(route: RouteInfo) {
        return route.meta.role === "admin" ? true : "/forbidden";
      }
    }
    const instance = new Guards();

    @route("/settings", { guards: ["admin_only"], meta: { role: "user" } })
    class SettingsPage {}

    const router = new TestRouter();
    const result = await router.checkGuards("/settings");

    expect(result).toBe("/forbidden");
  });

  it("guard can block based on meta", async () => {
    class Guards {
      @guard("auth_gate")
      authGate(route: RouteInfo) {
        return route.meta.public === true ? true : false;
      }
    }
    const instance = new Guards();

    @route("/private", { guards: ["auth_gate"], meta: { public: false } })
    class PrivatePage {}

    const router = new TestRouter();
    const result = await router.checkGuards("/private");

    expect(result).toBe(false);
  });

  it("guard receives group-inherited meta", async () => {
    let captured: RouteInfo | null = null;

    class Guards {
      @guard("group_check")
      check(route: RouteInfo) {
        captured = route;
        return true;
      }
    }
    const instance = new Guards();

    @group("/admin", { meta: { requiresAuth: true, layout: "sidebar" } })
    class AdminGroup {}

    @route("/users", { group: AdminGroup, guards: ["group_check"], meta: { section: "users" } })
    class AdminUsers {}

    const router = new TestRouter();
    await router.checkGuards("/admin/users");

    expect(captured).not.toBeNull();
    expect(captured!.path).toBe("/admin/users");
    // Group meta merged with route meta
    expect(captured!.meta).toEqual({
      requiresAuth: true,
      layout: "sidebar",
      section: "users",
    });
  });

  it("no guards means path is allowed (no crash)", async () => {
    @route("/open")
    class OpenPage {}

    const router = new TestRouter();
    const result = await router.checkGuards("/open");

    expect(result).toBe(true);
  });

  it("unmatched path is allowed", async () => {
    const router = new TestRouter();
    const result = await router.checkGuards("/nonexistent");
    expect(result).toBe(true);
  });
});
