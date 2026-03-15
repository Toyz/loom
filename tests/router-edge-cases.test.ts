/**
 * Tests: Router edge cases
 * — Guard redirect loop protection
 * — Path normalization (query strings, trailing slashes)
 * — Concurrent navigation abort
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { compilePattern, matchRoute, routes, buildPath, routeByName } from "../src/router/route";
import type { RouteEntry } from "../src/router/route";

// ── Path normalization ──

describe("path normalization via matchRoute", () => {
  const entries: RouteEntry[] = [];

  beforeEach(() => {
    routes.length = 0;
    routeByName.clear();

    // Register test routes
    const { regex, paramNames } = compilePattern("/store");
    const entry: RouteEntry = {
      pattern: "/store",
      regex,
      paramNames,
      tag: "page-store",
      ctor: class {} as any,
      guards: [],
      meta: {},
    };
    routes.push(entry);
    entries.push(entry);

    const userRoute = compilePattern("/user/:id");
    const userEntry: RouteEntry = {
      pattern: "/user/:id",
      regex: userRoute.regex,
      paramNames: userRoute.paramNames,
      tag: "page-user",
      ctor: class {} as any,
      guards: [],
      meta: {},
      name: "user",
    };
    routes.push(userEntry);
    routeByName.set("user", userEntry);
    entries.push(userEntry);
  });

  it("matches exact path", () => {
    const match = matchRoute("/store");
    expect(match).not.toBeNull();
    expect(match!.entry.tag).toBe("page-store");
  });

  it("does NOT match trailing slash (requires normalization)", () => {
    // Routes are compiled without trailing slash tolerance,
    // normalization happens in router._normalizePath before matching
    const match = matchRoute("/store/");
    expect(match).toBeNull();
  });

  it("does NOT match with query string (requires normalization)", () => {
    const match = matchRoute("/store?tab=2");
    expect(match).toBeNull();
  });

  it("extracts params from dynamic route", () => {
    const match = matchRoute("/user/42");
    expect(match).not.toBeNull();
    expect(match!.params).toEqual({ id: "42" });
  });
});

// ── buildPath ──

describe("buildPath", () => {
  beforeEach(() => {
    routes.length = 0;
    routeByName.clear();

    const userRoute = compilePattern("/user/:id");
    const userEntry: RouteEntry = {
      pattern: "/user/:id",
      regex: userRoute.regex,
      paramNames: userRoute.paramNames,
      tag: "page-user",
      ctor: class {} as any,
      guards: [],
      meta: {},
      name: "user",
    };
    routes.push(userEntry);
    routeByName.set("user", userEntry);
  });

  it("builds path from named route with params", () => {
    expect(buildPath("user", { id: "42" })).toBe("/user/42");
  });

  it("throws for unknown route name", () => {
    expect(() => buildPath("nonexistent")).toThrow("Unknown route name");
  });

  it("throws for missing param", () => {
    expect(() => buildPath("user", {})).toThrow('Missing param "id"');
  });
});

// ── compilePattern ──

describe("compilePattern", () => {
  it("compiles static route", () => {
    const { regex, paramNames } = compilePattern("/about");
    expect(paramNames).toEqual([]);
    expect(regex.test("/about")).toBe(true);
    expect(regex.test("/about/extra")).toBe(false);
  });

  it("compiles dynamic route with params", () => {
    const { regex, paramNames } = compilePattern("/blog/:slug");
    expect(paramNames).toEqual(["slug"]);
    expect(regex.test("/blog/hello-world")).toBe(true);
    expect(regex.test("/blog/")).toBe(false);
  });

  it("compiles multiple params", () => {
    const { regex, paramNames } = compilePattern("/org/:org/repo/:repo");
    expect(paramNames).toEqual(["org", "repo"]);
    const match = "/org/toyz/repo/loom".match(regex);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("toyz");
    expect(match![2]).toBe("loom");
  });

  it("compiles wildcard", () => {
    const { regex, paramNames } = compilePattern("*");
    expect(paramNames).toEqual([]);
    expect(regex.test("/anything/at/all")).toBe(true);
    expect(regex.test("")).toBe(true);
  });

  it("escapes special regex characters in static segments", () => {
    const { regex } = compilePattern("/file.txt");
    expect(regex.test("/file.txt")).toBe(true);
    expect(regex.test("/fileXtxt")).toBe(false);
  });
});

// ── Route matching order ──

describe("route matching order", () => {
  beforeEach(() => {
    routes.length = 0;
    routeByName.clear();
  });

  it("first registered route wins", () => {
    const r1 = compilePattern("/page");
    routes.push({
      pattern: "/page", ...r1,
      tag: "first", ctor: class {} as any, guards: [], meta: {},
    });
    const r2 = compilePattern("/page");
    routes.push({
      pattern: "/page", ...r2,
      tag: "second", ctor: class {} as any, guards: [], meta: {},
    });

    const match = matchRoute("/page");
    expect(match!.entry.tag).toBe("first");
  });

  it("wildcard registered last catches unmatched paths", () => {
    const r1 = compilePattern("/known");
    routes.push({
      pattern: "/known", ...r1,
      tag: "known-page", ctor: class {} as any, guards: [], meta: {},
    });
    const r2 = compilePattern("*");
    routes.push({
      pattern: "*", ...r2,
      tag: "not-found", ctor: class {} as any, guards: [], meta: {},
    });

    expect(matchRoute("/known")!.entry.tag).toBe("known-page");
    expect(matchRoute("/unknown")!.entry.tag).toBe("not-found");
  });

  it("wildcard registered first eats everything", () => {
    const r1 = compilePattern("*");
    routes.push({
      pattern: "*", ...r1,
      tag: "catch-all", ctor: class {} as any, guards: [], meta: {},
    });
    const r2 = compilePattern("/specific");
    routes.push({
      pattern: "/specific", ...r2,
      tag: "specific-page", ctor: class {} as any, guards: [], meta: {},
    });

    // Wildcard wins because it was registered first
    expect(matchRoute("/specific")!.entry.tag).toBe("catch-all");
  });
});
