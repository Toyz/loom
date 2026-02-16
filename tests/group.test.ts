/**
 * Tests: @group — route groups with prefix, guards, and nesting
 */
import { describe, it, expect, beforeEach } from "vitest";
import { routes, matchRoute, GROUP_META, ROUTE_GROUP } from "../src/router/route";
import { route, group, ROUTE_PATH } from "../src/router/decorators";

// Clear route table between tests
beforeEach(() => {
  routes.length = 0;
});

describe("@group", () => {
  it("stores GROUP_META on the constructor", () => {
    @group("/api")
    class ApiGroup {}

    expect((ApiGroup as any)[GROUP_META]).toEqual({
      prefix: "/api",
      guards: [],
    });
  });

  it("stores guards in GROUP_META", () => {
    @group("/admin", { guards: ["auth", "role"] })
    class AdminGroup {}

    expect((AdminGroup as any)[GROUP_META]).toEqual({
      prefix: "/admin",
      guards: ["auth", "role"],
    });
  });
});

describe("@route with { group }", () => {
  it("prepends group prefix to route pattern", () => {
    @group("/api")
    class ApiGroup {}

    @route("/users", { group: ApiGroup })
    class UsersPage {}

    expect((UsersPage as any)[ROUTE_PATH]).toBe("/api/users");
    const match = matchRoute("/api/users");
    expect(match).not.toBeNull();
    expect(match!.entry.ctor).toBe(UsersPage);
  });

  it("handles root route '/' within a group", () => {
    @group("/dashboard")
    class DashGroup {}

    @route("/", { group: DashGroup })
    class DashIndex {}

    expect((DashIndex as any)[ROUTE_PATH]).toBe("/dashboard");
    const match = matchRoute("/dashboard");
    expect(match).not.toBeNull();
    expect(match!.entry.ctor).toBe(DashIndex);
  });

  it("merges group guards before route guards", () => {
    @group("/admin", { guards: ["auth"] })
    class AdminGroup {}

    @route("/settings", { group: AdminGroup, guards: ["role"] })
    class AdminSettings {}

    const match = matchRoute("/admin/settings");
    expect(match).not.toBeNull();
    expect(match!.entry.guards).toEqual(["auth", "role"]);
  });

  it("extracts params from group prefix", () => {
    @group("/user/:profile")
    class UserGroup {}

    @route("/posts", { group: UserGroup })
    class UserPosts {}

    const match = matchRoute("/user/alice/posts");
    expect(match).not.toBeNull();
    expect(match!.params).toEqual({ profile: "alice" });
  });

  it("extracts params from both group and route", () => {
    @group("/user/:profile")
    class UserGroup {}

    @route("/post/:postId", { group: UserGroup })
    class PostDetail {}

    const match = matchRoute("/user/bob/post/42");
    expect(match).not.toBeNull();
    expect(match!.params).toEqual({ profile: "bob", postId: "42" });
  });

  it("stores ROUTE_GROUP parent reference", () => {
    @group("/api")
    class ApiGroup {}

    @route("/items", { group: ApiGroup })
    class ItemsPage {}

    expect((ItemsPage as any)[ROUTE_GROUP]).toBe(ApiGroup);
  });
});

describe("nested @group", () => {
  it("chains prefixes through nested groups", () => {
    @group("/app")
    class AppGroup {}

    @group("/admin", { guards: ["auth"] })
    @route("/", { group: AppGroup })
    class AdminGroup {}

    @route("/users", { group: AdminGroup })
    class AdminUsers {}

    // AdminGroup itself at /app/admin
    const adminMatch = matchRoute("/app/admin");
    expect(adminMatch).not.toBeNull();
    expect(adminMatch!.entry.ctor).toBe(AdminGroup);

    // AdminUsers at /app/admin/users
    const usersMatch = matchRoute("/app/admin/users");
    expect(usersMatch).not.toBeNull();
    expect(usersMatch!.entry.ctor).toBe(AdminUsers);
  });

  it("chains guards through nested groups (root → leaf)", () => {
    @group("/app", { guards: ["session"] })
    class AppGroup {}

    @group("/admin", { guards: ["auth"] })
    @route("/", { group: AppGroup })
    class AdminGroup {}

    @route("/logs", { group: AdminGroup, guards: ["audit"] })
    class AdminLogs {}

    const match = matchRoute("/app/admin/logs");
    expect(match).not.toBeNull();
    // session (from AppGroup) → auth (from AdminGroup) → audit (from route)
    expect(match!.entry.guards).toEqual(["session", "auth", "audit"]);
  });

  it("cascades params through nested groups", () => {
    @group("/org/:orgId")
    class OrgGroup {}

    @group("/team/:teamId")
    @route("/", { group: OrgGroup })
    class TeamGroup {}

    @route("/member/:memberId", { group: TeamGroup })
    class MemberPage {}

    const match = matchRoute("/org/acme/team/alpha/member/jane");
    expect(match).not.toBeNull();
    expect(match!.params).toEqual({
      orgId: "acme",
      teamId: "alpha",
      memberId: "jane",
    });
  });
});

describe("@group + @route stacking", () => {
  it("allows a class to be both a group and a route", () => {
    @group("/user/:id", { guards: ["auth"] })
    @route("/user/:id")
    class UserLayout {}

    // The class itself is a route
    const match = matchRoute("/user/123");
    expect(match).not.toBeNull();
    expect(match!.entry.ctor).toBe(UserLayout);
    expect(match!.params).toEqual({ id: "123" });

    // And it has group metadata for children
    expect((UserLayout as any)[GROUP_META]).toEqual({
      prefix: "/user/:id",
      guards: ["auth"],
    });
  });
});
