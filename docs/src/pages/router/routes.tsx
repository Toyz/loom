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
          <p>Loom picks the most specific pattern that matches, not the first one declared. Specificity is compared segment by segment: an exact segment beats a partial match like <span class="ic">*.png</span>, which beats a named param, which beats a splat. So <span class="ic">/user/new</span> wins over <span class="ic">/user/:id</span> whichever file imported first, and there is no ordering to maintain.</p>
          <punch-matrix
            columns="MATCHES EXACTLY,CAPTURES A VALUE,SPANS MANY SEGMENTS"
            rows={[
              { name: `"/users"`, punches: "MATCHES EXACTLY", note: "Static, and preferred over any dynamic one" },
              { name: `"/users/:id"`, punches: "CAPTURES A VALUE", note: "One segment, bound to a route prop" },
              { name: `"/files/*"`, punches: "SPANS MANY SEGMENTS", note: "Wildcard, value discarded" },
              { name: `"/files/*path"`, punches: "CAPTURES A VALUE,SPANS MANY SEGMENTS", note: "Wildcard, captured under a name" },
            ]}
          ></punch-matrix>
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
              The most specific matching pattern wins. Patterns are compared one
              segment at a time, and the first segment they disagree on decides it —
              which is how a reader would compare them, and why a single
              "count the params" score cannot do the job:
            </p>
            <api-table
              head={["Segment", "Beats", "Example"]}
              rows={[
                ["Exact", "everything below", <code>/user/new</code>],
                ["Partial wildcard", "param, splat", <code>/files/*.png</code>],
                ["Named param", "splat", <code>/user/:id</code>],
                ["Splat", "nothing", <code>/files/*</code>],
              ]}
            ></api-table>
            <code-block lang="ts" code={`// Any import order. /user/new reaches PageNewUser, /user/42 reaches PageUser.
@route("/user/:id")
@route("/user/new")

// Segment 1 settles it: "new" is exact, ":id" is not. The params
// in segment 2 never come into it.
@route("/user/:id/edit")
@route("/user/new/:tab")

// The bare catch-all is last by definition.
@route("*")`}></code-block>
            <p class="note">
              Two patterns of equal specificity keep registration order, so an
              exact duplicate still resolves to whichever registered first.
            </p>
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
