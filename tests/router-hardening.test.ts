/**
 * Tests: router guard results, URL/query handling, param encoding, wildcards.
 *
 *  - `return result.error as string ?? false` parses as
 *    `(result.error as string) ?? false`, so a guard returning
 *    LoomResult.err(new Error(...)) returned the Error object. Callers test
 *    only `=== false` and `typeof === "string"`, so it matched neither and the
 *    navigation was ALLOWED.
 *  - _normalizePath strips the query and the stripped value was what got
 *    written to the address bar, so router.go("/s?q=x") dropped ?q=x.
 *  - Nothing encoded or decoded params, so "Ada Lovelace" did not round-trip.
 *  - compilePattern regex-escaped "*" inside a segment into a literal.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { routes, guardRegistry, routeByName, compilePattern, matchRoute, buildPath } from "../src/router/route";
import { route, guard } from "../src/router/decorators";
import { LoomRouter, type RouteInfo } from "../src/router/router";
import type { RouterMode } from "../src/router/mode";
import { LoomResult } from "../src/result";

class MockMode implements RouterMode {
  path: string;
  writeCalls: string[] = [];
  replaceCalls: string[] = [];
  constructor(initial = "/") { this.path = initial; }
  read(): string { return this.path; }
  write(p: string): void { this.path = p; this.writeCalls.push(p); }
  replace(p: string): void { this.path = p; this.replaceCalls.push(p); }
  listen(_cb: () => void): () => void { return () => {}; }
  href(p: string): string { return p; }
}

class TestRouter extends LoomRouter {
  constructor(public mock: MockMode) {
    super();
    (this as any).mode = mock;
  }
  get currentPath(): string { return this.current.path; }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  routes.length = 0;
  guardRegistry.clear();
  routeByName.clear();
});

// ── Guard results ───────────────────────────────────────────────────────────

describe("guard results", () => {
  it("LoomResult.err(Error) blocks navigation", async () => {
    class G {
      @guard("err_obj")
      check(_r: RouteInfo) { return LoomResult.err(new Error("denied")); }
    }
    new G();

    @route("/admin", { guards: ["err_obj"] })
    class Admin {}
    @route("/")
    class Home {}

    const mock = new MockMode("/");
    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/admin");
    expect(router.currentPath).not.toBe("/admin");
    expect(mock.path).not.toBe("/admin");
  });

  it("LoomResult.err(string) still redirects", async () => {
    class G {
      @guard("err_str")
      check(_r: RouteInfo) { return LoomResult.err("/login"); }
    }
    new G();

    @route("/secret", { guards: ["err_str"] })
    class Secret {}
    @route("/login")
    class Login {}

    const router = new TestRouter(new MockMode("/"));
    router.start();
    await flush();

    await router.go("/secret");
    expect(router.currentPath).toBe("/login");
  });

  it("LoomResult.ok allows navigation", async () => {
    class G {
      @guard("ok_guard")
      check(_r: RouteInfo) { return LoomResult.ok(); }
    }
    new G();

    @route("/page", { guards: ["ok_guard"] })
    class Page {}

    const router = new TestRouter(new MockMode("/"));
    router.start();
    await flush();

    await router.go("/page");
    expect(router.currentPath).toBe("/page");
  });
});

// ── Query preservation ──────────────────────────────────────────────────────

describe("query strings", () => {
  it("go() keeps the query in the URL but matches on the bare path", async () => {
    @route("/search")
    class Search {}

    const mock = new MockMode("/");
    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/search?q=loom&page=2");

    // Address bar keeps the query; matching and RouteChanged use the bare path.
    expect(mock.path).toBe("/search?q=loom&page=2");
    expect(router.currentPath).toBe("/search");
  });

  it("replace() keeps the query too", async () => {
    @route("/list")
    class List {}

    const mock = new MockMode("/");
    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.replace("/list?sort=desc");
    expect(mock.path).toBe("/list?sort=desc");
    expect(router.currentPath).toBe("/list");
  });

  it("still strips a trailing slash while keeping the query", async () => {
    @route("/docs")
    class Docs {}

    const mock = new MockMode("/");
    const router = new TestRouter(mock);
    router.start();
    await flush();

    await router.go("/docs/?x=1");
    expect(mock.path).toBe("/docs?x=1");
  });
});

// ── Param encoding ──────────────────────────────────────────────────────────

describe("param encoding", () => {
  it("buildPath encodes values with spaces", () => {
    @route("/user/:name", { name: "user" })
    class User {}
    expect(buildPath("user", { name: "Ada Lovelace" })).toBe("/user/Ada%20Lovelace");
  });

  it("buildPath encodes a slash so it cannot forge a segment", () => {
    @route("/user/:id", { name: "u2" })
    class U {}
    expect(buildPath("u2", { id: "a/b" })).toBe("/user/a%2Fb");
  });

  it("matchRoute decodes params", () => {
    @route("/user/:name")
    class User {}
    const m = matchRoute("/user/Ada%20Lovelace");
    expect(m?.params.name).toBe("Ada Lovelace");
  });

  it("round-trips through buildPath and matchRoute", () => {
    @route("/tag/:label", { name: "tag" })
    class Tag {}
    const path = buildPath("tag", { label: "c++ & rust" });
    expect(matchRoute(path)?.params.label).toBe("c++ & rust");
  });

  it("does not throw on a malformed percent sequence", () => {
    @route("/user/:name")
    class User {}
    expect(() => matchRoute("/user/%E0%A4%A")).not.toThrow();
    expect(matchRoute("/user/%E0%A4%A")?.params.name).toBe("%E0%A4%A");
  });
});

// ── Wildcards ───────────────────────────────────────────────────────────────

describe("wildcard patterns", () => {
  it("matches an in-segment star", () => {
    const { regex } = compilePattern("/files/*.png");
    expect(regex.test("/files/logo.png")).toBe(true);
    expect(regex.test("/files/logo.jpg")).toBe(false);
  });

  it("does not let an in-segment star cross a slash", () => {
    const { regex } = compilePattern("/files/*.png");
    expect(regex.test("/files/nested/logo.png")).toBe(false);
  });

  it("treats a bare star segment as a splat", () => {
    const { regex, paramNames } = compilePattern("/docs/*");
    expect(regex.test("/docs/a/b/c")).toBe(true);
    expect(paramNames).toEqual(["wildcard"]);
  });

  it("still supports the whole-pattern catch-all", () => {
    const { regex } = compilePattern("*");
    expect(regex.test("/anything/at/all")).toBe(true);
  });

  it("still escapes regex metacharacters in literal segments", () => {
    const { regex } = compilePattern("/a.b/c");
    expect(regex.test("/a.b/c")).toBe(true);
    expect(regex.test("/axb/c")).toBe(false);
  });

  it("named params still work alongside", () => {
    const { regex, paramNames } = compilePattern("/user/:id/edit");
    expect(paramNames).toEqual(["id"]);
    expect(regex.test("/user/42/edit")).toBe(true);
  });
});
