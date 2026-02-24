/**
 * Router — Route Data
 * /router/route-data
 *
 * @prop({ param }), @prop({ params }), @prop({ query }), @prop({ query: routeQuery }),
 * @prop({ meta }), @prop({ meta: routeMeta })
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterRouteData extends LoomElement {
  update() {
    return (
      <div>
        <h1>Route Data</h1>
        <p class="subtitle">
          Inject URL params, query strings, and route metadata into your components with{" "}
          <span class="ic">@prop</span>.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--amber)"></loom-icon>
            <h2>Route Params</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@prop({"{"} param: "name" {"}"})</div>
            <div class="dec-desc">
              Pick a single <span class="ic">:param</span> from the URL path.
              The property is reactive — navigation updates it automatically:
            </div>
            <code-block lang="ts" code={`@route("/users/:id")
@component("page-user")
class PageUser extends LoomElement {
  @prop({ param: "id" }) accessor userId = "";

  update() {
    return <h1>User: {this.userId}</h1>;
  }
}`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@prop({"{"} params {"}"})</div>
            <div class="dec-desc">
              Decompose <strong>all</strong> route params into a single object. Useful when you
              have multiple dynamic segments:
            </div>
            <code-block lang="ts" code={`import { params } from "@toyz/loom/router";

@route("/org/:orgId/team/:teamId")
@component("page-team")
class PageTeam extends LoomElement {
  // { orgId: "acme", teamId: "design" }
  @prop({ params }) accessor routeParams: Record<string, string> = {};

  update() {
    return (
      <div>
        <p>Org: {this.routeParams.orgId}</p>
        <p>Team: {this.routeParams.teamId}</p>
      </div>
    );
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="search" size={20} color="var(--cyan)"></loom-icon>
            <h2>Query Strings</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@prop({"{"} query: "name" {"}"})</div>
            <div class="dec-desc">
              Pick a single <span class="ic">?key=value</span> from the URL query string:
            </div>
            <code-block lang="ts" code={`@route("/settings")
@component("page-settings")
class PageSettings extends LoomElement {
  // URL: /settings?tab=profile -> "profile"
  @prop({ query: "tab" }) accessor tab = "general";

  update() {
    return (
      <div>
        <nav>
          <a href="#/settings?tab=general">General</a>
          <a href="#/settings?tab=profile">Profile</a>
          <a href="#/settings?tab=billing">Billing</a>
        </nav>
        <div>Active tab: {this.tab}</div>
      </div>
    );
  }
}`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@prop({"{"} query: routeQuery {"}"})</div>
            <div class="dec-desc">
              Decompose <strong>all</strong> query params into a single object.
              Import the <span class="ic">routeQuery</span> sentinel from the router:
            </div>
            <code-block lang="ts" code={`import { routeQuery } from "@toyz/loom/router";

@route("/search")
@component("page-search")
class PageSearch extends LoomElement {
  // URL: /search?q=loom&sort=stars&page=2
  // -> { q: "loom", sort: "stars", page: "2" }
  @prop({ query: routeQuery }) accessor filters: Record<string, string> = {};

  update() {
    return (
      <div>
        <p>Query: {this.filters.q}</p>
        <p>Sort: {this.filters.sort}</p>
        <p>Page: {this.filters.page}</p>
      </div>
    );
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="database" size={20} color="var(--emerald)"></loom-icon>
            <h2>Route Metadata</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@prop({"{"}  meta: "key" {"}"})</div>
            <div class="dec-desc">
              Pick a single value from the route's <span class="ic">meta</span> object.
              Meta is set on <span class="ic">@route</span> and <span class="ic">@group</span>,
              and group meta is inherited by child routes:
            </div>
            <code-block lang="ts" code={`@route("/admin/settings", {
  group: AdminGroup,
  meta: { layout: "sidebar", role: "admin" }
})
@component("page-admin-settings")
class PageAdminSettings extends LoomElement {
  @prop({ meta: "layout" }) accessor layout = "";
  @prop({ meta: "role" }) accessor role = "";

  update() {
    return (
      <div class={this.layout}>
        <p>Role: {this.role}</p>
      </div>
    );
  }
}`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@prop({"{"}  meta: routeMeta {"}"})</div>
            <div class="dec-desc">
              Decompose <strong>all</strong> route metadata into a single object.
              Import the <span class="ic">routeMeta</span> sentinel from the router:
            </div>
            <code-block lang="ts" code={`import { routeMeta } from "@toyz/loom/router";

@route("/dashboard", { meta: { theme: "dark", analytics: "dash" } })
@component("page-dashboard")
class PageDashboard extends LoomElement {
  // { theme: "dark", analytics: "dash" }
  @prop({ meta: routeMeta }) accessor allMeta: Record<string, unknown> = {};

  update() {
    return <div data-theme={this.allMeta.theme as string}>Dashboard</div>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--rose)"></loom-icon>
            <h2>@transform</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Route params and query strings are always strings from the URL. Use{" "}
              <span class="ic">@transform</span> to parse them into typed values:
            </div>
            <code-block lang="ts" code={`import { transform } from "@toyz/loom/transform";

@route("/users/:id")
@component("page-user")
class PageUser extends LoomElement {
  // "42" -> 42
  @prop({ param: "id" })
  @transform((v) => Number(v))
  accessor userId = 0;

  // "true" -> true
  @prop({ query: "admin" })
  @transform((v) => v === "true")
  accessor isAdmin = false;
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="grid" size={20} color="var(--emerald)"></loom-icon>
            <h2>Combining Params + Query + Meta</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Mix and match single picks, full decompose, query strings,
              and route metadata on the same component:
            </div>
            <code-block lang="ts" code={`@route("/users/:id/posts", {
  group: AdminGroup, // inherits group meta
  meta: { analytics: "user-posts" }
})
@component("page-user-posts")
class PageUserPosts extends LoomElement {
  @prop({ param: "id" }) accessor userId = "";
  @prop({ query: "sort" }) accessor sort = "newest";
  @prop({ query: "page" })
  @transform((v) => Number(v) || 1)
  accessor page = 1;
  @prop({ meta: "analytics" }) accessor analyticsPage = "";
  @prop({ meta: "layout" }) accessor layout = ""; // inherited from group

  update() {
    return (
      <div class={this.layout}>
        <h1>Posts by User {this.userId}</h1>
        <p>Sorted by: {this.sort}, Page: {this.page}</p>
      </div>
    );
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Decorator</th><th>Import</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>@prop({"{"} param: "key" {"}"})</code></td>
                <td><code>@toyz/loom</code></td>
                <td>Inject a single <code>:key</code> from the URL path</td>
              </tr>
              <tr>
                <td><code>@prop({"{"} params {"}"})</code></td>
                <td><code>params</code> from <code>@toyz/loom/router</code></td>
                <td>Inject all route params as an object</td>
              </tr>
              <tr>
                <td><code>@prop({"{"} query: "key" {"}"})</code></td>
                <td><code>@toyz/loom</code></td>
                <td>Inject a single <code>?key=value</code> from the query string</td>
              </tr>
              <tr>
                <td><code>@prop({"{"} query: routeQuery {"}"})</code></td>
                <td><code>routeQuery</code> from <code>@toyz/loom/router</code></td>
                <td>Inject all query params as an object</td>
              </tr>
              <tr>
                <td><code>@prop({"{"} meta: "key" {"}"}) </code></td>
                <td><code>@toyz/loom</code></td>
                <td>Inject a single value from route metadata</td>
              </tr>
              <tr>
                <td><code>@prop({"{"} meta: routeMeta {"}"})</code></td>
                <td><code>routeMeta</code> from <code>@toyz/loom/router</code></td>
                <td>Inject all route metadata as an object</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
