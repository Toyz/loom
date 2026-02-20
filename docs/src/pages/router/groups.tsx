/**
 * Router — Route Groups
 * /router/groups
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterGroups extends LoomElement {
  update() {
    return (
      <div>
        <h1>Route Groups</h1>
        <p class="subtitle">
          Organize routes with shared prefixes and guards using <span class="ic">@group</span>.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--emerald)"></loom-icon>
            <h2>@group</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@group(prefix, opts?)</div>
            <div class="dec-desc">
              The <span class="ic">@group</span> class decorator defines a route group.
              Child routes opt in by referencing the group constructor in their <span class="ic">@route</span> options.
              The group's prefix is prepended and its guards run before route-level guards:
            </div>
            <code-block lang="tsx" code={`import { group, route } from "@toyz/loom/router";

@group("/api")
class ApiGroup {}

@route("/users", { group: ApiGroup })
@component("page-api-users")
class PageApiUsers extends LoomElement {
  // Matches: /api/users
  update() { return <h1>API Users</h1>; }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--accent)"></loom-icon>
            <h2>Group Options</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The second argument to <span class="ic">@group</span> is an optional options object:
            </div>
          </div>
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
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--amber)"></loom-icon>
            <h2>Group Guards</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Guards defined on a group run <strong>before</strong> any route-level guards.
              This makes it easy to protect entire sections of your app:
            </div>
            <code-block lang="ts" code={`@group("/admin", { guards: ["auth", "admin"] })
class AdminGroup {}

// Both "auth" and "admin" guards run before "audit"
@route("/logs", { group: AdminGroup, guards: ["audit"] })
@component("page-admin-logs")
class PageAdminLogs extends LoomElement { }

// Guard order: auth → admin → audit`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
            <h2>Nested Groups</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Groups can nest by stacking <span class="ic">@group</span> and <span class="ic">@route</span> on the same class.
              Prefixes and guards chain from root to leaf:
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--rose)"></loom-icon>
            <h2>Dynamic Params in Groups</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Group prefixes can contain dynamic <span class="ic">:param</span> segments.
              Parameters cascade to all child routes:
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--amber)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@group</span> is a class decorator built on <span class="ic">createDecorator</span>.
              At define-time it stores group metadata (prefix, guards) on the constructor.
              When <span class="ic">@route</span> sees a <span class="ic">group</span> option, it walks the group chain
              from leaf to root — collecting all prefixes and guards — then compiles the full
              pattern into a single regex.
            </div>
            <div class="dec-desc" style="margin-top: 0.75rem">
              Since TypeScript class decorators run bottom-up, <span class="ic">@group</span> automatically
              patches route entries that were registered by <span class="ic">@route</span> on the same class.
              This means decorator order doesn't matter for correctness.
            </div>
          </div>
        </section>
      </div>
    );
  }
}
