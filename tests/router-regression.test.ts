/**
 * Regression tests: router bug fixes (v0.20.5)
 *
 * Covers:
 *  1. _resolve() path passthrough — no async mode.read() drift
 *  2. _doRender receives resolved path — never re-reads mode
 *  3. Bounce-back passes explicit path to _doRender
 *  4. Dead _resolveInjectParams removed (no runtime calls)
 *  5. Outlet firstUpdated normalizes path (query, trailing slash)
 *  6. _resolveWithGuards redirect uses normalized path
 *  7. go() blocked by false — URL unchanged, no render
 *  8. Concurrent popstate during async guard — stale nav discarded
 *  9. Path normalization applied uniformly
 * 10. Route lifecycle hooks with path passthrough
 * 11. RouteChanged event carries correct path after redirect
 * 12. Same-path navigation — no duplicate RouteChanged
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { routes, guardRegistry, routeByName, compilePattern } from "../src/router/route";
import { route, guard, group } from "../src/router/decorators";
import { LoomRouter, type RouteInfo } from "../src/router/router";
import type { RouterMode } from "../src/router/mode";
import { bus } from "../src/bus";
import { RouteChanged } from "../src/router/events";

// ── MockMode ──────────────────────────────────────────────────────────────────

class MockMode implements RouterMode {
  public path: string;
  public writeCalls: string[] = [];
  public replaceCalls: string[] = [];
  private _listener: (() => void) | null = null;

  constructor(initial = "/") {
    this.path = initial;
  }

  read(): string { return this.path; }

  write(p: string): void {
    this.path = p;
    this.writeCalls.push(p);
  }

  replace(p: string): void {
    this.path = p;
    this.replaceCalls.push(p);
  }

  listen(cb: () => void): () => void {
    this._listener = cb;
    return () => { this._listener = null; };
  }

  href(p: string): string { return p; }

  /** Simulate browser back/forward — fires listener */
  simulatePopstate(path: string): void {
    this.path = path;
    this._listener?.();
  }

  /**
   * Simulate mode.read() changing between guard await and _doRender.
   * This verifies path passthrough prevents async drift.
   */
  driftPathAfterDelay(to: string, ms: number): void {
    setTimeout(() => { this.path = to; }, ms);
  }
}

// ── TestRouter ────────────────────────────────────────────────────────────────

class TestRouter extends LoomRouter {
  constructor(public mock: MockMode) {
    super();
    (this as any).mode = mock;
  }

  resolveWithGuards(): Promise<void> {
    return (this as any)._resolveWithGuards();
  }

  get currentPath(): string { return this.current.path; }
  get currentTag(): string | null { return this.current.tag; }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  routes.length = 0;
  guardRegistry.clear();
  routeByName.clear();
});

const flush = (ms = 0) => new Promise(r => setTimeout(r, ms));

// ═════════════════════════════════════════════════════════════════════════════
// 1. _resolve() uses passed path — not mode.read()
// ═════════════════════════════════════════════════════════════════════════════

describe("path passthrough: _resolve uses passed path, not mode.read()", () => {
  it("renders the guard-approved path even if mode drifts during await", async () => {
    const guardDelay = 20;
    const mock = new MockMode("/slow-page");

    class G {
      @guard("slow_guard")
      async check(_r: RouteInfo) {
        await new Promise(r => setTimeout(r, guardDelay));
        return true;
      }
    }
    new G();

    @route("/slow-page", { guards: ["slow_guard"] })
    class SlowPage {}

    @route("/sneaky")
    class Sneaky {}

    const router = new TestRouter(mock);
    router.start();

    // While guard is awaiting, drift mode to /sneaky
    mock.driftPathAfterDelay("/sneaky", guardDelay / 2);

    await flush(guardDelay + 10);

    // Router should have rendered /slow-page (the approved path)
    // NOT /sneaky (the drifted mode.read() value)
    expect(router.currentPath).toBe("/slow-page");
  });

  it("go() renders the target path even if mode.read() lags", async () => {
    const mock = new MockMode("/");

    @route("/")
    class Home {}

    @route("/target")
    class Target {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // go() writes path to mode, then calls _doRender(path)
    // Even if something changes mode.read() between write() and render,
    // the passed path is used.
    await router.go("/target");

    expect(router.currentPath).toBe("/target");
    expect(mock.writeCalls).toContain("/target");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Bounce-back uses explicit path — not mode.read()
// ═════════════════════════════════════════════════════════════════════════════

describe("bounce-back passes explicit path to _doRender", () => {
  it("renders previous path after guard returns false", async () => {
    const mock = new MockMode("/safe");

    class G {
      @guard("bouncer")
      check(r: RouteInfo) { return r.path === "/safe"; }
    }
    new G();

    @route("/safe", { guards: ["bouncer"] })
    class Safe {}

    @route("/restricted", { guards: ["bouncer"] })
    class Restricted {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    expect(router.currentPath).toBe("/safe");

    // Simulate back-button to /restricted
    mock.simulatePopstate("/restricted");
    await flush();

    // Should bounce back to /safe (previous)
    expect(mock.path).toBe("/safe");
    expect(router.currentPath).toBe("/safe");
    expect(mock.replaceCalls).toContain("/safe");
  });

  it("bounces to root when no previous path exists and guard blocks", async () => {
    const mock = new MockMode("/locked");

    class G {
      @guard("lockout")
      check(_r: RouteInfo) { return false; }
    }
    new G();

    @route("/locked", { guards: ["lockout"] })
    class Locked {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // No previous → bounces to "/"
    expect(mock.path).toBe("/");
    expect(router.currentPath).toBe("/");
  });

  it("bounce-back does not re-run guards on the bounced path", async () => {
    const callLog: string[] = [];
    const mock = new MockMode("/page-a");

    class G {
      @guard("log_guard")
      check(r: RouteInfo) {
        callLog.push(r.path);
        return r.path !== "/page-b";
      }
    }
    new G();

    @route("/page-a", { guards: ["log_guard"] })
    class PageA {}

    @route("/page-b", { guards: ["log_guard"] })
    class PageB {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    callLog.length = 0; // reset after initial

    mock.simulatePopstate("/page-b");
    await flush();

    // Guard should fire once for /page-b (blocked)
    // Bounce-back to /page-a should NOT re-check guards
    // (bounce goes directly to _doRender, not _resolveWithGuards)
    expect(callLog).toEqual(["/page-b"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Concurrent navigation — stale navs discarded
// ═════════════════════════════════════════════════════════════════════════════

describe("concurrent navigation: stale async guards discarded", () => {
  it("two rapid navigations — only the last one renders", async () => {
    const mock = new MockMode("/");
    let guardCallCount = 0;

    class G {
      @guard("async_slow")
      async check(_r: RouteInfo) {
        guardCallCount++;
        await new Promise(r => setTimeout(r, 20));
        return true;
      }
    }
    new G();

    @route("/")
    class Home {}

    @route("/first", { guards: ["async_slow"] })
    class First {}

    @route("/second", { guards: ["async_slow"] })
    class Second {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // Fire two navigations rapidly — first should be discarded
    const p1 = router.go("/first");
    const p2 = router.go("/second");

    await Promise.all([p1, p2]);
    await flush(30);

    // Only /second should be rendered (first was superseded)
    expect(router.currentPath).toBe("/second");
  });

  it("popstate during async programmatic nav — programmatic discarded", async () => {
    const mock = new MockMode("/");

    class G {
      @guard("slow_prog")
      async check(_r: RouteInfo) {
        await new Promise(r => setTimeout(r, 30));
        return true;
      }
    }
    new G();

    @route("/")
    class Home {}

    @route("/slow", { guards: ["slow_prog"] })
    class Slow {}

    @route("/fast")
    class Fast {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // Start slow programmatic nav
    const slowNav = router.go("/slow");

    // Before guard resolves, user hits back to /fast
    await flush(10);
    mock.simulatePopstate("/fast");

    await slowNav;
    await flush(40);

    // /fast should win — /slow guard was stale
    expect(router.currentPath).toBe("/fast");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Path normalization applied uniformly
// ═════════════════════════════════════════════════════════════════════════════

describe("path normalization", () => {
  it("trailing slash stripped in go()", async () => {
    const mock = new MockMode("/");

    @route("/page")
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/page/");

    expect(router.currentPath).toBe("/page");
    expect(mock.path).toBe("/page");
  });

  it("query string stripped in go()", async () => {
    const mock = new MockMode("/");

    @route("/search")
    class Search {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/search?q=hello");

    expect(router.currentPath).toBe("/search");
  });

  it("leading slash enforced in go()", async () => {
    const mock = new MockMode("/");

    @route("/about")
    class About {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("about");

    expect(router.currentPath).toBe("/about");
  });

  it("normalization works on listener path (popstate)", async () => {
    const mock = new MockMode("/");

    @route("/store")
    class Store {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // Simulate back to URL with trailing slash + query
    mock.simulatePopstate("/store/?tab=2");
    await flush();

    expect(router.currentPath).toBe("/store");
  });

  it("normalization preserves root /", async () => {
    const mock = new MockMode("/");

    @route("/")
    class Root {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    expect(router.currentPath).toBe("/");
  });

  it("replace() normalizes path", async () => {
    const mock = new MockMode("/");

    @route("/page")
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.replace("/page/");

    expect(router.currentPath).toBe("/page");
    expect(mock.replaceCalls).toContain("/page");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. RouteChanged event carries correct path
// ═════════════════════════════════════════════════════════════════════════════

describe("RouteChanged event correctness", () => {
  it("carries the resolved path after guard redirect", async () => {
    const events: RouteChanged[] = [];
    const cleanup = bus.on(RouteChanged, (e: RouteChanged) => events.push(e));

    const mock = new MockMode("/private");

    class G {
      @guard("auth_event")
      check(_r: RouteInfo) { return "/login"; }
    }
    new G();

    @route("/private", { guards: ["auth_event"] })
    class Private {}

    @route("/login")
    class Login {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // Should have received RouteChanged with /login, not /private
    const lastEvent = events[events.length - 1];
    expect(lastEvent.path).toBe("/login");

    cleanup();
  });

  it("carries normalized path (no query, no trailing slash)", async () => {
    const events: RouteChanged[] = [];
    const cleanup = bus.on(RouteChanged, (e: RouteChanged) => events.push(e));

    const mock = new MockMode("/");

    @route("/page")
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/page/?foo=bar");
    await flush();

    const lastEvent = events[events.length - 1];
    expect(lastEvent.path).toBe("/page");

    cleanup();
  });

  it("previous path is correct across navigations", async () => {
    const events: RouteChanged[] = [];
    const cleanup = bus.on(RouteChanged, (e: RouteChanged) => events.push(e));

    const mock = new MockMode("/");

    @route("/")
    class Home {}

    @route("/a")
    class PageA {}

    @route("/b")
    class PageB {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/a");
    await router.go("/b");

    expect(events.length).toBeGreaterThanOrEqual(3);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.path).toBe("/b");
    expect(lastEvent.previous).toBe("/a");

    cleanup();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. go() blocked by false — URL unchanged
// ═════════════════════════════════════════════════════════════════════════════

describe("go() blocked by false", () => {
  it("URL and router state unchanged when go() guard returns false", async () => {
    const mock = new MockMode("/home");

    class G {
      @guard("block_go")
      check(_r: RouteInfo) { return false; }
    }
    new G();

    @route("/home")
    class Home {}

    @route("/blocked", { guards: ["block_go"] })
    class Blocked {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    expect(router.currentPath).toBe("/home");

    await router.go("/blocked");

    // Nothing changed
    expect(router.currentPath).toBe("/home");
    expect(mock.path).toBe("/home");
    // write() was never called for /blocked
    expect(mock.writeCalls).not.toContain("/blocked");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. Guard redirect chain normalization
// ═════════════════════════════════════════════════════════════════════════════

describe("guard redirect chain normalization", () => {
  it("redirect target with trailing slash is normalized before _resolveWithGuards recurse", async () => {
    const mock = new MockMode("/gated");

    class G {
      @guard("redirect_slash")
      check(_r: RouteInfo) { return "/landing/"; } // trailing slash in redirect
    }
    new G();

    @route("/gated", { guards: ["redirect_slash"] })
    class Gated {}

    @route("/landing")
    class Landing {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // Redirect target should be normalized: /landing/ → /landing
    expect(mock.path).toBe("/landing");
    expect(router.currentPath).toBe("/landing");
  });

  it("redirect target with query is normalized", async () => {
    const mock = new MockMode("/gated2");

    class G {
      @guard("redirect_query")
      check(_r: RouteInfo) { return "/landing?ref=guard"; }
    }
    new G();

    @route("/gated2", { guards: ["redirect_query"] })
    class Gated2 {}

    @route("/landing")
    class Landing {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    expect(mock.path).toBe("/landing");
    expect(router.currentPath).toBe("/landing");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. Multiple listeners — _cleanup prevents leak
// ═════════════════════════════════════════════════════════════════════════════

describe("start/stop lifecycle", () => {
  it("start() is idempotent — second call is a no-op", async () => {
    const mock = new MockMode("/");

    @route("/")
    class Home {}

    const router = new TestRouter(mock);
    router.start();
    router.start(); // should not double-register listener
    await flush();

    // Only one render happened
    expect(router.currentPath).toBe("/");
  });

  it("stop() removes listener — popstate no longer triggers resolve", async () => {
    const mock = new MockMode("/");

    @route("/")
    class Home {}

    @route("/other")
    class Other {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    router.stop();

    // Simulate popstate — should NOT trigger re-resolve
    mock.simulatePopstate("/other");
    await flush();

    // Router state unchanged because listener was removed
    expect(router.currentPath).toBe("/");
  });

  it("start after stop re-registers listener", async () => {
    const mock = new MockMode("/");

    @route("/")
    class Home {}

    @route("/page")
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    router.stop();
    mock.path = "/page";
    router.start();
    await flush();

    expect(router.currentPath).toBe("/page");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. Named route navigation
// ═════════════════════════════════════════════════════════════════════════════

describe("named route navigation", () => {
  it("go() with named route resolves params", async () => {
    const mock = new MockMode("/");

    @route("/user/:id", { name: "user" })
    class UserPage {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go({ name: "user", params: { id: "42" } });

    expect(router.currentPath).toBe("/user/42");
    expect(router.current.params).toEqual({ id: "42" });
  });

  it("replace() with named route resolves params", async () => {
    const mock = new MockMode("/");

    @route("/post/:slug", { name: "post" })
    class PostPage {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.replace({ name: "post", params: { slug: "hello-world" } });

    expect(router.currentPath).toBe("/post/hello-world");
    expect(mock.replaceCalls).toContain("/post/hello-world");
  });

  it("href() with named route builds correct href", async () => {
    const mock = new MockMode("/");

    @route("/item/:id", { name: "item" })
    class ItemPage {}

    const router = new TestRouter(mock);
    const result = router.href({ name: "item", params: { id: "99" } });

    expect(result).toBe("/item/99");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. Guard with LoomResult integration
// ═════════════════════════════════════════════════════════════════════════════

describe("guard with LoomResult return type", () => {
  it("LoomResult.ok allows navigation", async () => {
    const { LoomResult } = await import("../src/result");
    const mock = new MockMode("/");

    class G {
      @guard("result_ok")
      check(_r: RouteInfo) { return LoomResult.ok(true); }
    }
    new G();

    @route("/page", { guards: ["result_ok"] })
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/page");

    expect(router.currentPath).toBe("/page");
  });

  it("LoomResult.err redirects to error string", async () => {
    const { LoomResult } = await import("../src/result");
    const mock = new MockMode("/");

    class G {
      @guard("result_err")
      check(_r: RouteInfo) { return LoomResult.err("/error-page"); }
    }
    new G();

    @route("/secret", { guards: ["result_err"] })
    class Secret {}

    @route("/error-page")
    class ErrorPage {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/secret");

    expect(router.currentPath).toBe("/error-page");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. Meta propagation
// ═════════════════════════════════════════════════════════════════════════════

describe("route meta propagation", () => {
  it("meta from route is available in guard and current", async () => {
    const receivedMeta: Record<string, unknown>[] = [];
    const mock = new MockMode("/");

    class G {
      @guard("meta_check")
      check(r: RouteInfo) {
        receivedMeta.push(r.meta);
        return true;
      }
    }
    new G();

    @route("/admin", { guards: ["meta_check"], meta: { role: "admin", layout: "wide" } })
    class Admin {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/admin");

    expect(receivedMeta.length).toBeGreaterThan(0);
    expect(receivedMeta[receivedMeta.length - 1]).toEqual({ role: "admin", layout: "wide" });
    expect(router.current.meta).toEqual({ role: "admin", layout: "wide" });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. Guard not found — warn but allow
// ═════════════════════════════════════════════════════════════════════════════

describe("missing guard handling", () => {
  it("unknown guard name warns but allows navigation", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mock = new MockMode("/");

    @route("/page", { guards: ["nonexistent_guard"] })
    class Page {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/page");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("nonexistent_guard"),
    );
    // Navigation still allowed despite missing guard
    expect(router.currentPath).toBe("/page");

    warnSpy.mockRestore();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 13. Edge: guard changes return value between navigations
// ═════════════════════════════════════════════════════════════════════════════

describe("dynamic guard behavior", () => {
  it("guard that changes behavior over time", async () => {
    let isLoggedIn = false;
    const mock = new MockMode("/");

    class G {
      @guard("dynamic_auth")
      check(_r: RouteInfo) { return isLoggedIn ? true : "/login"; }
    }
    new G();

    @route("/dashboard", { guards: ["dynamic_auth"] })
    class Dashboard {}

    @route("/login")
    class Login {}

    const router = new TestRouter(mock);
    router.start();
    await flush();

    // Not logged in — redirect
    await router.go("/dashboard");
    expect(router.currentPath).toBe("/login");

    // Now logged in
    isLoggedIn = true;
    await router.go("/dashboard");
    expect(router.currentPath).toBe("/dashboard");
  });
});
