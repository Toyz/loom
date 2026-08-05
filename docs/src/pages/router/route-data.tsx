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
        <doc-header title="Route Data" subtitle="Inject URL params, query strings, and route metadata into your components with @prop."></doc-header>

        <section>
          <p>Reading the current route inside a component means finding the router, asking it for its state, and re-reading whenever it changes. Doing that in every routed component is the boilerplate this page exists to remove.</p>
          <p>Route props are declared as fields and filled in by the outlet on match. They come from the URL, so they are strings — a transform converts them at the boundary. When a key is genuinely absent the field returns to the default you declared, rather than to an empty string that a numeric prop would coerce to zero.</p>
          <punch-matrix
            columns="FROM PATH,FROM QUERY,FROM META,WHOLE OBJECT"
            rows={[
              { name: `@prop({ param: "name" })`, punches: "FROM PATH", note: "One named path segment" },
              { name: "@prop({ params })", punches: "FROM PATH,WHOLE OBJECT", note: "Every path segment at once" },
              { name: `@prop({ query: "name" })`, punches: "FROM QUERY", note: "One query-string key" },
              { name: "@prop({ query: routeQuery })", punches: "FROM QUERY,WHOLE OBJECT", note: "The whole query string" },
              { name: `@prop({ meta: "key" })`, punches: "FROM META", note: "One key of the route's meta" },
              { name: "@prop({ meta: routeMeta })", punches: "FROM META,WHOLE OBJECT", note: "Route meta merged with its group's" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Route Params">
          <api-entry sig={`@prop({ param: "name" })`}>
            <p>
              Pick a single <span class="ic">:param</span> from the URL path.
              The property is reactive — navigation updates it automatically:
            </p>
            <code-block lang="ts" code={`@route("/users/:id")
@component("page-user")
class PageUser extends LoomElement {
  @prop({ param: "id" }) accessor userId = "";

  update() {
    return <h1>User: {this.userId}</h1>;
  }
}`}></code-block>
          </api-entry>
          <api-entry sig={`@prop({ params })`}>
            <p>
              Decompose <strong>all</strong> route params into a single object. Useful when you
              have multiple dynamic segments:
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="Query Strings">
          <api-entry sig={`@prop({ query: "name" })`}>
            <p>
              Pick a single <span class="ic">?key=value</span> from the URL query string:
            </p>
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
          </api-entry>
          <doc-section heading="Writing the query back">
            <p>
              A query binding is one-way by default: the URL sets the property, and
              setting the property does not touch the URL. That is right for a value the
              page only reads, and wrong for anything the user changes — a filter, a
              page number, a search box. The view updates, the address bar does not, and
              the URL stops describing what is on screen: refresh, share and bookmark
              all lose it, and Back does not undo the change.
            </p>
            <p><span class="ic">sync</span> makes that binding two-way.</p>
            <code-block lang="ts" code={QUERY_SYNC}></code-block>
            <api-table
              head={["Option", "Default", "What it does"]}
              rows={[
                [<code>history</code>, <code>"replace"</code>, <>Rewrite the current entry, or <code>"push"</code> to add one</>],
                [<code>debounce</code>, <code>0</code>, "Wait this long after the last write before touching the URL"],
                [<code>includeDefault</code>, <code>false</code>, "Write the key even when the value equals the declared default"],
              ]}
            ></api-table>
            <p class="note">
              Defaults are omitted, so <span class="ic">accessor page = 1</span> leaves no{" "}
              <span class="ic">?page=1</span> behind and a pristine view keeps a pristine URL.
              Each key is written independently, so two synced props on one page cannot
              clobber each other.
            </p>
            <p class="caution">
              Use <span class="ic">replace</span> for anything that changes as fast as a
              user can think. A search box on <span class="ic">push</span> is one Back press
              per keystroke. <span class="ic">push</span> is for a change Back should undo,
              like a page number — and pair a text input with{" "}
              <span class="ic">debounce</span> regardless.
            </p>
            <p class="note">
              Only available on a single query key. The type rejects it on{" "}
              <span class="ic">param</span> (a path param cannot change without re-routing),
              on <span class="ic">meta</span> (static config), and on{" "}
              <span class="ic">routeQuery</span> (writing the whole object back would mean
              diffing it). Sync also does nothing when no router is mounted — there is no
              address bar to own.
            </p>
          </doc-section>

          <api-entry sig={`@prop({ query: routeQuery })`}>
            <p>
              Decompose <strong>all</strong> query params into a single object.
              Import the <span class="ic">routeQuery</span> sentinel from the router:
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="Route Metadata">
          <api-entry sig={`@prop({ meta: "key" })`}>
            <p>
              Pick a single value from the route's <span class="ic">meta</span> object.
              Meta is set on <span class="ic">@route</span> and <span class="ic">@group</span>,
              and group meta is inherited by child routes:
            </p>
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
          </api-entry>
          <api-entry sig={`@prop({ meta: routeMeta })`}>
            <p>
              Decompose <strong>all</strong> route metadata into a single object.
              Import the <span class="ic">routeMeta</span> sentinel from the router:
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="@transform">
            <p>
              Route params and query strings are always strings from the URL. Use <span class="ic">@transform</span> to parse them into typed values:
            </p>
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
        </doc-section>
        <doc-section heading="Combining Params + Query + Meta">
            <p>
              Mix and match single picks, full decompose, query strings,
              and route metadata on the same component:
            </p>
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
        </doc-section>
        <doc-section heading="API Reference">
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
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}

const QUERY_SYNC = `@component("gallery-page")
class GalleryPage extends LoomElement {
  // Replace, and omit ?type=all when it sits at the default.
  @prop({ query: "type", sync: true }) accessor filter = "all";

  // A text input: one history entry, not one per keystroke.
  @prop({ query: "q", sync: { debounce: 300 } }) accessor query = "";

  // Back should step back a page.
  @prop({ query: "page", sync: { history: "push" } }) accessor page = 1;
}

this.filter = "animated";   // -> /gallery?type=animated
this.filter = "all";        // -> /gallery`;
