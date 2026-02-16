/**
 * Tests: Named routes — buildPath, routeByName, @route({ name }), groups
 */
import { describe, it, expect, beforeEach } from "vitest";
import { routes, routeByName, buildPath, matchRoute } from "../src/router/route";
import { route, group, ROUTE_PATH } from "../src/router/decorators";

// Clear route table + name map between tests
beforeEach(() => {
  routes.length = 0;
  routeByName.clear();
});

describe("buildPath", () => {
  it("substitutes single param", () => {
    @route("/user/:id", { name: "user" })
    class UserPage {}

    expect(buildPath("user", { id: "42" })).toBe("/user/42");
  });

  it("substitutes multiple params", () => {
    @route("/org/:orgId/team/:teamId", { name: "team" })
    class TeamPage {}

    expect(buildPath("team", { orgId: "acme", teamId: "dev" })).toBe("/org/acme/team/dev");
  });

  it("works with no params", () => {
    @route("/about", { name: "about" })
    class AboutPage {}

    expect(buildPath("about")).toBe("/about");
  });

  it("throws for unknown route name", () => {
    expect(() => buildPath("nonexistent")).toThrow('[Loom] Unknown route name: "nonexistent"');
  });

  it("throws for missing param", () => {
    @route("/user/:id", { name: "usr" })
    class UserPage2 {}

    expect(() => buildPath("usr", {})).toThrow('[Loom] Missing param "id" for route "usr"');
  });
});

describe("@route with name", () => {
  it("registers in routeByName map", () => {
    @route("/docs/:slug", { name: "doc" })
    class DocPage {}

    expect(routeByName.has("doc")).toBe(true);
    expect(routeByName.get("doc")!.ctor).toBe(DocPage);
    expect(routeByName.get("doc")!.pattern).toBe("/docs/:slug");
  });

  it("stores name on RouteEntry", () => {
    @route("/settings", { name: "settings" })
    class SettingsPage {}

    const match = matchRoute("/settings");
    expect(match).not.toBeNull();
    expect(match!.entry.name).toBe("settings");
  });

  it("route without name has undefined name", () => {
    @route("/plain")
    class PlainPage {}

    const match = matchRoute("/plain");
    expect(match).not.toBeNull();
    expect(match!.entry.name).toBeUndefined();
  });

  it("warns on duplicate name (does not throw)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    @route("/first", { name: "dup" })
    class First {}

    @route("/second", { name: "dup" })
    class Second {}

    expect(warn).toHaveBeenCalledWith('[Loom] Duplicate route name: "dup"');
    // Last registration wins
    expect(routeByName.get("dup")!.ctor).toBe(Second);

    warn.mockRestore();
  });
});

describe("named routes with @group", () => {
  it("builds correct path through group prefix", () => {
    @group("/api")
    class ApiGroup {}

    @route("/users", { group: ApiGroup, name: "api-users" })
    class ApiUsers {}

    expect(routeByName.has("api-users")).toBe(true);
    expect(buildPath("api-users")).toBe("/api/users");
  });

  it("builds correct path with params through nested groups", () => {
    @group("/org/:orgId")
    class OrgGroup {}

    @group("/team/:teamId")
    @route("/", { group: OrgGroup })
    class TeamGroup {}

    @route("/member/:memberId", { group: TeamGroup, name: "member" })
    class MemberPage {}

    expect(buildPath("member", { orgId: "acme", teamId: "alpha", memberId: "jane" }))
      .toBe("/org/acme/team/alpha/member/jane");
  });
});

describe("matchRoute returns name", () => {
  it("includes name in matched entry", () => {
    @route("/profile/:username", { name: "profile" })
    class ProfilePage {}

    const match = matchRoute("/profile/alice");
    expect(match).not.toBeNull();
    expect(match!.entry.name).toBe("profile");
    expect(match!.params).toEqual({ username: "alice" });
  });
});
