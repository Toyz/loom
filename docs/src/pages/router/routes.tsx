/**
 * Router — Routes & Params
 * /router/routes
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterRoutes extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Routes &amp; Params" subtitle="Declarative routing with @route, dynamic segments, and fully typed route data."></doc-header>

        <section>
          <p>A route is a pattern and a component. The pattern's job is to be unambiguous, which is harder than it looks the moment two of them can match the same URL — <span class="ic">/user/:id</span> and <span class="ic">/user/new</span> both match <span class="ic">/user/new</span>.</p>
          <p>Loom matches in registration order, first match wins. That is worth knowing because it makes the outcome depend on import order: whichever module was imported first gets asked first. Declare the specific pattern before the general one.</p>
        </section>

        <doc-section heading="@route">
          <api-entry sig="@route(pattern, opts?)">
            <p>
              Use <span class="ic">@route</span> on a <span class="ic">LoomElement</span> class to register it as a routed page.
              Dynamic segments use <span class="ic">:param</span> syntax. Use <span class="ic">*</span> for a catch-all:
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="Pattern Matching">
            <p>
              Routes are matched in registration order. Wildcards (<span class="ic">*</span>) are always checked last.
              The first match wins — order your routes from most to least specific:
            </p>
            <code-block lang="ts" code={`// Matched first (more specific)
@route("/users/:id/posts/:slug")

// Matched second
@route("/users/:id")

// Matched last (catch-all)
@route("*")`}></code-block>
        </doc-section>
        <doc-section heading="Typed Route Data">
            <p>
              Use <span class="ic">@prop</span> with route options to inject URL params and query strings
              as typed properties. Combine with <span class="ic">@transform</span> for automatic type conversion:
            </p>
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
        </doc-section>
        <doc-section heading="Route Options">
            <p>
              The second argument to <span class="ic">@route</span> is an optional options object:
            </p>
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
        </doc-section>
        <doc-section heading="Named Routes">
            <p>
              Give a route a <span class="ic">name</span> to navigate by name instead of raw path.
              Use <span class="ic">buildPath()</span> to generate URLs, or pass a name target
              to <span class="ic">router.go()</span> and <span class="ic">&lt;loom-link&gt;</span>:
            </p>
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
        </doc-section>
        <doc-section heading="How It Works">
            <p>
              <span class="ic">@route</span> is a class decorator built on <span class="ic">createDecorator</span>.
              At define-time it compiles the pattern into a regex and registers the route entry.
              The tag is lazily resolved from <span class="ic">@component</span> — so decorator order doesn't matter.
            </p>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
