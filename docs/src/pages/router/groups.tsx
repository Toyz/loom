/**
 * Router — Route Groups
 * /router/groups
 */
import { LoomElement, component, mount } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { RouterGroup } from "../../groups";
import { docStyles } from "../../styles/doc-page";

@route("/groups", { group: RouterGroup })
@component("page-router-groups")
export class PageRouterGroups extends LoomElement {

  @mount
  setup() {}

  update() {
    return (
      <div>
        <h1>Route Groups</h1>
        <p class="subtitle">
          Organize routes with shared prefixes and guards using <span class="ic">@group</span>.
        </p>

        <section>
          <h2>@group(prefix, opts?)</h2>
          <p>
            The <span class="ic">@group</span> class decorator defines a route group.
            Child routes opt in by referencing the group constructor in their <span class="ic">@route</span> options.
            The group's prefix is prepended and its guards run before route-level guards:
          </p>
          <code-block lang="tsx" code={`import { group, route } from "@toyz/loom/router";

@group("/api")
class ApiGroup {}

@route("/users", { group: ApiGroup })
@component("page-api-users")
class PageApiUsers extends LoomElement {
  // Matches: /api/users
  update() { return <h1>API Users</h1>; }
}`}></code-block>
        </section>

        <section>
          <h2>Group Options</h2>
          <p>
            The second argument to <span class="ic">@group</span> is an optional options object:
          </p>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr>
                <td><code>guards</code></td>
                <td><code>string[]</code></td>
                <td>Guards that run before <strong>every</strong> child route in this group, preceding any route-level guards.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Group Guards</h2>
          <p>
            Guards defined on a group run <strong>before</strong> any route-level guards.
            This makes it easy to protect entire sections of your app:
          </p>
          <code-block lang="ts" code={`@group("/admin", { guards: ["auth", "admin"] })
class AdminGroup {}

// Both "auth" and "admin" guards run before "audit"
@route("/logs", { group: AdminGroup, guards: ["audit"] })
@component("page-admin-logs")
class PageAdminLogs extends LoomElement { }

// Guard order: auth → admin → audit`}></code-block>
        </section>

        <section>
          <h2>Nested Groups</h2>
          <p>
            Groups can nest by stacking <span class="ic">@group</span> and <span class="ic">@route</span> on the same class.
            Prefixes and guards chain from root to leaf:
          </p>
          <code-block lang="tsx" code={`@group("/app", { guards: ["session"] })
class AppGroup {}

// AdminGroup is both a group and a route at /app/admin
@group("/admin", { guards: ["auth"] })
@route("/", { group: AppGroup })
@component("layout-admin")
class AdminGroup extends LoomElement {
  update() { return <loom-outlet inherit-styles></loom-outlet>; }
}

// Matches: /app/admin/users
// Guards:  session → auth
@route("/users", { group: AdminGroup })
@component("page-admin-users")
class PageAdminUsers extends LoomElement { }`}></code-block>
        </section>

        <section>
          <h2>Dynamic Params in Groups</h2>
          <p>
            Group prefixes can contain dynamic <span class="ic">:param</span> segments.
            Parameters cascade to all child routes:
          </p>
          <code-block lang="ts" code={`@group("/org/:orgId")
class OrgGroup {}

@group("/team/:teamId")
@route("/", { group: OrgGroup })
class TeamGroup {}

// Matches: /org/acme/team/alpha/member/jane
// Params:  { orgId: "acme", teamId: "alpha", memberId: "jane" }
@route("/member/:memberId", { group: TeamGroup })
@component("page-member")
class PageMember extends LoomElement { }`}></code-block>
        </section>

        <section>
          <h2>How It Works</h2>
          <p>
            <span class="ic">@group</span> is a class decorator built on <span class="ic">createDecorator</span>.
            At define-time it stores group metadata (prefix, guards) on the constructor.
            When <span class="ic">@route</span> sees a <span class="ic">group</span> option, it walks the group chain
            from leaf to root — collecting all prefixes and guards — then compiles the full
            pattern into a single regex.
          </p>
          <p>
            Since TypeScript class decorators run bottom-up, <span class="ic">@group</span> automatically
            patches route entries that were registered by <span class="ic">@route</span> on the same class.
            This means decorator order doesn't matter for correctness.
          </p>
        </section>
      </div>
    );
  }
}
