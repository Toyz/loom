/**
 * Router — Routes & Params
 * /router/routes
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterRoutes extends LoomElement {
  update() {
    return (
      <div>
        <h1>Routes &amp; Params</h1>
        <p class="subtitle">
          Declarative routing with <span class="ic">@route</span>, dynamic segments, and fully typed route data.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--amber)"></loom-icon>
            <h2>@route</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@route(pattern, opts?)</div>
            <div class="dec-desc">
              Use <span class="ic">@route</span> on a <span class="ic">LoomElement</span> class to register it as a routed page.
              Dynamic segments use <span class="ic">:param</span> syntax. Use <span class="ic">*</span> for a catch-all:
            </div>
            <code-block lang="tsx" code={`import { route } from "@toyz/loom/router";

@route("/users")
@component("page-users")
class PageUsers extends LoomElement {
  update() { return <h1>Users</h1>; }
}

@route("/users/:id")
@component("page-user-detail")
class PageUserDetail extends LoomElement { }

// Catch-all (404)
@route("*")
@component("page-not-found")
class PageNotFound extends LoomElement { }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--emerald)"></loom-icon>
            <h2>Pattern Matching</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Routes are matched in registration order. Wildcards (<span class="ic">*</span>) are always checked last.
              The first match wins — order your routes from most to least specific:
            </div>
            <code-block lang="ts" code={`// Matched first (more specific)
@route("/users/:id/posts/:slug")

// Matched second
@route("/users/:id")

// Matched last (catch-all)
@route("*")`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--accent)"></loom-icon>
            <h2>Typed Route Data</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use <span class="ic">@prop</span> with route options to inject URL params and query strings
              as typed properties. Combine with <span class="ic">@transform</span> for automatic type conversion:
            </div>
            <code-block lang="tsx" code={`import { params, routeQuery, transform, typed } from "@toyz/loom/router";

interface UserParams { id: number; slug: string }

@route("/users/:id/posts/:slug")
@component("page-user-detail")
class PageUserDetail extends LoomElement {
  // Single param — "42" → 42
  @prop({ param: "id" })
  @transform(Number)
  userId!: number;

  // Full params with typed<T>() — type-safe field conversion
  @prop({ params })
  @transform(typed<UserParams>({ id: Number }))
  routeParams!: UserParams;
  // TS enforces: id converter returns number, slug passes through

  // Single query value — ?tab=settings
  @prop({ query: "tab" })
  tab!: string;

  // Full query object — ?page=2&sort=name
  @prop({ query: routeQuery })
  qs!: { page: string; sort: string };

  update() {
    return <h1>User {this.userId}</h1>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--cyan)"></loom-icon>
            <h2>Route Options</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The second argument to <span class="ic">@route</span> is an optional options object:
            </div>
          </div>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr>
                <td><code>guards</code></td>
                <td><code>string[]</code></td>
                <td>Named guards to run before rendering. See <loom-link to="/router/guards" style="color: var(--accent)">Guards</loom-link>.</td>
              </tr>
              <tr>
                <td><code>group</code></td>
                <td><code>class</code></td>
                <td>Group constructor to inherit prefix and guards from. See <loom-link to="/router/groups" style="color: var(--accent)">Groups</loom-link>.</td>
              </tr>
              <tr>
                <td><code>name</code></td>
                <td><code>string</code></td>
                <td>Named route identifier for programmatic navigation via <span class="ic">buildPath()</span> or <span class="ic">router.go({"{"} name {"}"} )</span>.</td>
              </tr>
              <tr>
                <td><code>meta</code></td>
                <td><code>Record&lt;string, unknown&gt;</code></td>
                <td>Arbitrary metadata accessible to guards and lifecycle hooks via <span class="ic">RouteChanged.meta</span>.</td>
              </tr>
            </tbody>
          </table>
          <code-block lang="ts" code={`@route("/users/:id", {
  name: "user-detail",
  guards: ["auth"],
  group: ApiGroup,
  meta: { role: "admin", layout: "dashboard" },
})
@component("page-user-detail")
class PageUserDetail extends LoomElement { }`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="link" size={20} color="var(--rose)"></loom-icon>
            <h2>Named Routes</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Give a route a <span class="ic">name</span> to navigate by name instead of raw path.
              Use <span class="ic">buildPath()</span> to generate URLs, or pass a name target
              to <span class="ic">router.go()</span> and <span class="ic">&lt;loom-link&gt;</span>:
            </div>
            <code-block lang="tsx" code={`import { buildPath } from "@toyz/loom/router";

// Define
@route("/user/:id/post/:slug", { name: "user-post" })
@component("page-post")
class PagePost extends LoomElement { }

// Build a path
buildPath("user-post", { id: "42", slug: "hello" });
// → "/user/42/post/hello"

// Navigate imperatively
router.go({ name: "user-post", params: { id: "42", slug: "hello" } });

// Navigate declaratively
<loom-link name="user-post" params={{ id: "42", slug: "hello" }}>
  View Post
</loom-link>`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--amber)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@route</span> is a class decorator built on <span class="ic">createDecorator</span>.
              At define-time it compiles the pattern into a regex and registers the route entry.
              The tag is lazily resolved from <span class="ic">@component</span> — so decorator order doesn't matter.
            </div>
          </div>
        </section>
      </div>
    );
  }
}
