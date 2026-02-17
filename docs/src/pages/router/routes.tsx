/**
 * Router — Routes & Params
 * /router/routes
 */
import { LoomElement, component, mount } from "@toyz/loom";
import { docStyles } from "../../styles/doc-page";

export default class PageRouterRoutes extends LoomElement {

  @mount
  setup() {}

  update() {
    return (
      <div>
        <h1>Routes &amp; Params</h1>
        <p class="subtitle">
          Declarative routing with <span class="ic">@route</span>, dynamic segments, and fully typed route data.
        </p>

        <section>
          <h2>@route(pattern, opts?)</h2>
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
        </section>

        <section>
          <h2>Pattern Matching</h2>
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
        </section>

        <section>
          <h2>Typed Route Data</h2>
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
        </section>

        <section>
          <h2>Route Options</h2>
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
            </tbody>
          </table>
          <code-block lang="ts" code={`@route("/users/:id", {
  name: "user-detail",
  guards: ["auth"],
  group: ApiGroup,
})
@component("page-user-detail")
class PageUserDetail extends LoomElement { }`}></code-block>
        </section>

        <section>
          <h2>Named Routes</h2>
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
        </section>

        <section>
          <h2>How It Works</h2>
          <p>
            <span class="ic">@route</span> is a class decorator built on <span class="ic">createDecorator</span>.
            At define-time it compiles the pattern into a regex and registers the route entry.
            The tag is lazily resolved from <span class="ic">@component</span> — so decorator order doesn't matter.
          </p>
        </section>
      </div>
    );
  }
}
