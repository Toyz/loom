/**
 * Regression tests: guards run on direct URL / initial load / back-forward
 *
 * BUG FIXED: `_resolve()` was a sync void function that never called
 * `_checkGuards()`. Guards were only invoked in `go()` / `replace()`.
 * Typing a URL directly, hitting F5, or pressing browser back would
 * bypass ALL guards silently.
 *
 * FIX: split into:
 *   _resolveWithGuards() — async, runs guards (listener + initial load)
 *   _doRender()          — sync, skips guards (called after go/replace)
 *
 * Test targets:
 *   1. Guards run on initial router.start()
 *   2. Guards run on URL listener (back/forward/direct URL)
 *   3. Guard returning string → URL replaced at mode level
 *   4. Guard returning false  → URL bounced back to previous
 *   5. Guards in @group work on initial load
 *   6. Redirect chains work on initial load
 *   7. Redirect loop protection fires on _resolveWithGuards
 *   8. go() still runs guards (no regression)
 *   9. replace() still runs guards (no regression)
 *  10. No double guard invocation on programmatic go()
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { routes, guardRegistry } from "../src/router/route";
import { route, guard, group } from "../src/router/decorators";
import { LoomRouter, type RouteInfo } from "../src/router/router";
import type { RouterMode } from "../src/router/mode";

// ── MockMode ──────────────────────────────────────────────────────────────────
// A fully-controllable in-memory RouterMode for testing.

class MockMode implements RouterMode {
  public path: string;
  private _listener: (() => void) | null = null;

  constructor(initial = "/") {
    this.path = initial;
  }

  read(): string { return this.path; }

  // write() and replace() mirror pushState/replaceState — they update the URL
  // but do NOT fire the listener (popstate is only fired by browser back/forward).
  write(p: string): void   { this.path = p; }
  replace(p: string): void { this.path = p; }

  listen(cb: () => void): () => void {
    this._listener = cb;
    return () => { this._listener = null; };
  }

  href(p: string): string { return p; }

  /** Simulate browser navigation (back / forward / address bar) — fires listener without go()/replace() */
  simulateExternalNavigation(path: string): void {
    this.path = path;
    this._listener?.();
  }
}

// ── TestRouter ────────────────────────────────────────────────────────────────
// Exposes private internals + accepts a MockMode via constructor hack.

class TestRouter extends LoomRouter {
  constructor(public mock: MockMode) {
    super(); // defaults to hash; we override mode below
    (this as any).mode = mock;
  }

  /** Directly invoke the async path that runs guards */
  resolveWithGuards(): Promise<void> {
    return (this as any)._resolveWithGuards();
  }

  /** Expose _checkGuards for direct assertion */
  checkGuards(path: string): Promise<boolean | string> {
    return (this as any)._checkGuards(path);
  }

  get currentPath(): string {
    return this.current.path;
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  routes.length = 0;
  guardRegistry.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Guards run on initial router.start()
// ─────────────────────────────────────────────────────────────────────────────

describe("guards on initial load (start)", () => {
  it("redirect string: mode URL is replaced to the redirect target", async () => {
    const mock = new MockMode("/dashboard");

    class G {
      @guard("auth_init")
      check(_r: RouteInfo) { return "/login"; }
    }
    new G();

    @route("/dashboard", { guards: ["auth_init"] })
    class Dashboard {}

    @route("/login")
    class Login {}

    const router = new TestRouter(mock);
    router.start();
    // start() calls _resolveWithGuards() which is async — flush
    await new Promise(r => setTimeout(r, 0));

    expect(mock.path).toBe("/login");
  });

  it("allows navigation when guard returns true", async () => {
    const mock = new MockMode("/home");

    class G {
      @guard("allow_all_init")
      check(_r: RouteInfo) { return true; }
    }
    new G();

    @route("/home", { guards: ["allow_all_init"] })
    class Home {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    // Not redirected
    expect(mock.path).toBe("/home");
  });

  it("false block: bounces back to previous path (root on first load)", async () => {
    const mock = new MockMode("/secret");

    class G {
      @guard("block_init")
      check(_r: RouteInfo) { return false; }
    }
    new G();

    @route("/secret", { guards: ["block_init"] })
    class Secret {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    // No previous → bounced to "/"
    expect(mock.path).toBe("/");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Guards run via URL listener (browser back / forward / address bar)
// ─────────────────────────────────────────────────────────────────────────────

describe("guards on URL listener (back/forward/direct)", () => {
  it("redirect string: resets mode URL when external navigation fires", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("auth_listener")
      check(_r: RouteInfo) { return "/login"; }
    }
    new G();

    @route("/protected", { guards: ["auth_listener"] })
    class Protected {}

    @route("/login")
    class Login {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0)); // flush initial resolve

    // Simulate user typing /protected in the address bar (or history.back())
    mock.simulateExternalNavigation("/protected");
    await new Promise(r => setTimeout(r, 0)); // flush async guard

    expect(mock.path).toBe("/login");
  });

  it("allows route when guard returns true via listener", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("allow_listener")
      check(_r: RouteInfo) { return true; }
    }
    new G();

    @route("/page", { guards: ["allow_listener"] })
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    mock.simulateExternalNavigation("/page");
    await new Promise(r => setTimeout(r, 0));

    expect(mock.path).toBe("/page");
  });

  it("false block via listener: bounces back to current", async () => {
    const mock = new MockMode("/dashboard");

    // First: allow /dashboard
    class G {
      @guard("role_listener")
      check(r: RouteInfo) { return r.path === "/dashboard"; }
    }
    new G();

    @route("/dashboard", { guards: ["role_listener"] })
    class Dashboard {}

    @route("/admin", { guards: ["role_listener"] })
    class Admin {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    // Now user navigates directly to /admin (not allowed)
    mock.simulateExternalNavigation("/admin");
    await new Promise(r => setTimeout(r, 0));

    // Bounced back to /dashboard (the previous allowed path)
    expect(mock.path).toBe("/dashboard");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Guards in @group fire on initial load
// ─────────────────────────────────────────────────────────────────────────────

describe("group guards on initial load", () => {
  it("group-level guard redirects on direct URL", async () => {
    const guardFn = vi.fn().mockReturnValue("/login");

    class G {
      @guard("auth_group")
      check(_r: RouteInfo) { return guardFn(); }
    }
    new G();

    @group("/app", { guards: ["auth_group"] })
    class AppGroup {}

    @route("/settings", { group: AppGroup })
    class Settings {}

    @route("/login")
    class Login {}

    const mock = new MockMode("/app/settings");
    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    expect(guardFn).toHaveBeenCalled();
    expect(mock.path).toBe("/login");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Redirect chains on _resolveWithGuards
// ─────────────────────────────────────────────────────────────────────────────

describe("redirect chains on initial load", () => {
  it("follows redirect chain A → B → C until allowed", async () => {
    // /private → guard redirects to /semi → guard redirects to /open (allowed)
    const mock = new MockMode("/private");

    class G {
      @guard("chain_private")
      check(_r: RouteInfo) { return "/semi"; }

      @guard("chain_semi")
      check2(_r: RouteInfo) { return "/open"; }
    }
    new G();

    @route("/private", { guards: ["chain_private"] })
    class Private {}

    @route("/semi", { guards: ["chain_semi"] })
    class Semi {}

    @route("/open")
    class Open {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    expect(mock.path).toBe("/open");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Guard redirect loop protection on _resolveWithGuards
// ─────────────────────────────────────────────────────────────────────────────

describe("redirect loop protection on _resolveWithGuards", () => {
  it("aborts after MAX_GUARD_REDIRECTS hops (no infinite loop)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mock = new MockMode("/loop-a");

    class G {
      @guard("loop_a") goToB(_r: RouteInfo) { return "/loop-b"; }
      @guard("loop_b") goToA(_r: RouteInfo) { return "/loop-a"; }
    }
    new G();

    @route("/loop-a", { guards: ["loop_a"] })
    class LoopA {}

    @route("/loop-b", { guards: ["loop_b"] })
    class LoopB {}

    const router = new TestRouter(mock);
    router.start();

    // Give enough microtasks for the recursion to hit the cap
    await new Promise(r => setTimeout(r, 50));

    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Guard redirect loop"),
    );
    errSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. go() / replace() still run guards (regression — make sure _doRender path
//    didn't break programmatic navigation)
// ─────────────────────────────────────────────────────────────────────────────

describe("go() and replace() still run guards (no regression)", () => {
  it("go() redirects when guard returns string", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("auth_go")
      check(_r: RouteInfo) { return "/login"; }
    }
    new G();

    @route("/dashboard", { guards: ["auth_go"] })
    class Dashboard {}

    @route("/login")
    class Login {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    await router.go("/dashboard");

    expect(mock.path).toBe("/login");
  });

  it("go() allows navigation when guard returns true", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("open_go")
      check(_r: RouteInfo) { return true; }
    }
    new G();

    @route("/", { guards: ["open_go"] })
    class Home {}

    @route("/about", { guards: ["open_go"] })
    class About {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    await router.go("/about");

    expect(mock.path).toBe("/about");
  });

  it("replace() redirects when guard returns string", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("auth_replace")
      check(_r: RouteInfo) { return "/login"; }
    }
    new G();

    @route("/settings", { guards: ["auth_replace"] })
    class Settings {}

    @route("/login")
    class Login {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    await router.replace("/settings");

    expect(mock.path).toBe("/login");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. No double-invocation: go() checks guards once, not twice
// ─────────────────────────────────────────────────────────────────────────────

describe("no double guard invocation on programmatic navigation", () => {
  it("guard is called exactly once when using go()", async () => {
    const guardFn = vi.fn().mockReturnValue(true);
    const mock = new MockMode("/");

    class G {
      @guard("once_go")
      check(_r: RouteInfo) { return guardFn(); }
    }
    new G();

    @route("/", { guards: ["once_go"] })
    class Home {}

    @route("/target", { guards: ["once_go"] })
    class Target {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    const callsBefore = guardFn.mock.calls.length;
    await router.go("/target");
    // Flush any pending microtasks
    await new Promise(r => setTimeout(r, 10));

    const callsAfter = guardFn.mock.calls.length;
    // Exactly one additional call (for /target) — not two
    expect(callsAfter - callsBefore).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Route with no guards — always allowed on initial load (smoke)
// ─────────────────────────────────────────────────────────────────────────────

describe("unguarded routes on initial load", () => {
  it("route with no guards is accessible via direct URL", async () => {
    const mock = new MockMode("/public");

    @route("/public")
    class Public {}

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    expect(mock.path).toBe("/public");
  });

  it("unknown path is allowed (no match = no guards)", async () => {
    const mock = new MockMode("/does-not-exist");

    const router = new TestRouter(mock);
    router.start();
    await new Promise(r => setTimeout(r, 0));

    expect(mock.path).toBe("/does-not-exist");
  });
});
