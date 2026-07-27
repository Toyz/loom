/**
 * Route matching is ordered by specificity, not by import order.
 *
 * matchRoute() takes the first pattern that matches, and the table was in
 * whatever order the modules happened to be imported. So a codebase with
 * @route("/user/:id") and @route("/user/new") worked or did not depending on
 * which file was imported first: get it backwards and "/user/new" was
 * unreachable, its component never mounted, and "new" arrived as an id.
 * Nothing about either declaration hinted that their order mattered.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { routes, matchRoute, insertRoute, compilePattern, type RouteEntry } from "../src/router/route";

/** A route entry with only the fields matching cares about. */
function entry(pattern: string): RouteEntry {
  const { regex, paramNames } = compilePattern(pattern);
  return {
    pattern, regex, paramNames,
    tag: `t-${pattern.replace(/\W/g, "-")}`,
    ctor: class {},
    guards: [],
    meta: {},
  };
}

/** Register in the given order; matching must not depend on it. */
function register(...patterns: string[]) {
  for (const p of patterns) insertRoute(entry(p));
}

describe("route specificity", () => {
  beforeEach(() => { routes.length = 0; });

  it("prefers a static segment over a param, whichever registered first", () => {
    register("/user/:id", "/user/new");
    expect(matchRoute("/user/new")?.entry.pattern).toBe("/user/new");
    expect(matchRoute("/user/42")?.entry.pattern).toBe("/user/:id");
  });

  it("gives the same answer in the opposite registration order", () => {
    register("/user/new", "/user/:id");
    expect(matchRoute("/user/new")?.entry.pattern).toBe("/user/new");
    expect(matchRoute("/user/42")?.entry.pattern).toBe("/user/:id");
  });

  it("decides on the first segment the patterns disagree on", () => {
    register("/user/:id/edit", "/user/new/:tab");
    // Segment 1: "new" is static, ":id" is not -- that settles it, and the
    // param in segment 2 never comes into it.
    expect(matchRoute("/user/new/profile")?.entry.pattern).toBe("/user/new/:tab");
    expect(matchRoute("/user/42/edit")?.entry.pattern).toBe("/user/:id/edit");
  });

  it("ranks param above splat", () => {
    register("/files/*", "/files/:name");
    expect(matchRoute("/files/a.png")?.entry.pattern).toBe("/files/:name");
    expect(matchRoute("/files/a/b/c")?.entry.pattern).toBe("/files/*");
  });

  it("ranks a partial wildcard above a param", () => {
    register("/files/:name", "/files/*.png");
    expect(matchRoute("/files/logo.png")?.entry.pattern).toBe("/files/*.png");
    expect(matchRoute("/files/logo.gif")?.entry.pattern).toBe("/files/:name");
  });

  it("keeps the bare catch-all last however late the others register", () => {
    register("*", "/about", "/user/:id");
    expect(matchRoute("/about")?.entry.pattern).toBe("/about");
    expect(matchRoute("/user/1")?.entry.pattern).toBe("/user/:id");
    expect(matchRoute("/nowhere")?.entry.pattern).toBe("*");
  });

  it("prefers the longer pattern past a splat", () => {
    register("/docs/*", "/docs/api/reference");
    expect(matchRoute("/docs/api/reference")?.entry.pattern).toBe("/docs/api/reference");
    expect(matchRoute("/docs/anything/else")?.entry.pattern).toBe("/docs/*");
  });

  it("holds registration order between equally specific patterns", () => {
    register("/a/:x", "/b/:y", "/c/:z");
    expect(routes.map((r) => r.pattern)).toEqual(["/a/:x", "/b/:y", "/c/:z"]);
  });

  it("still extracts params from the route it picks", () => {
    register("/user/:id", "/user/new");
    expect(matchRoute("/user/42")?.params).toEqual({ id: "42" });
    expect(matchRoute("/user/new")?.params).toEqual({});
  });
});
