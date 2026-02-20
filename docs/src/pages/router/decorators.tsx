/**
 * Router — Decorators  /router/decorators
 *
 * @route, @guard, @group reference page.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterDecorators extends LoomElement {
  update() {
    return (
      <div>
        <h1>Decorators</h1>
        <p class="subtitle">Router-specific decorators for route registration, guards, and groups.</p>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--amber)"></loom-icon>
            <h2>@route</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@route(path, opts?)</div>
            <div class="dec-desc">
              Registers a class as a route handler. Supports path parameters,
              named routes, guards, and group membership.
            </div>
            <code-block lang="ts" code={`import { route } from "@toyz/loom/router";

@route("/docs/:slug")
@component("page-docs")
class PageDocs extends LoomElement { ... }

@route("/admin", { guards: ["auth", "role"] })
@component("page-admin")
class PageAdmin extends LoomElement { ... }

@route("/settings", { group: UserLayout, name: "user-settings" })
@component("user-settings")
class UserSettings extends LoomElement { ... }`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>guards</code></td><td><code>string[]</code></td><td>Named guards to check before rendering</td></tr>
              <tr><td><code>group</code></td><td><code>Constructor</code></td><td>Group this route belongs to (inherits prefix + guards)</td></tr>
              <tr><td><code>name</code></td><td><code>string</code></td><td>Named route for programmatic navigation</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--emerald)"></loom-icon>
            <h2>@guard</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@guard(name?)</div>
            <div class="dec-desc">
              Marks a method as a named route guard.
              Return <code>true</code> to allow, <code>false</code> to block,
              or a <code>string</code> to redirect. Async guards are awaited.
            </div>
            <code-block lang="ts" code={`import { guard } from "@toyz/loom/router";

@guard("auth")
checkAuth(@inject(AuthService) auth: AuthService) {
  return auth.isLoggedIn ? true : "/login";
}

// Name derived from method name:
@guard()
checkRole(@inject(UserStore) users: UserStore) {
  return users.current?.role === "admin" ? true : "/forbidden";
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>@group</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@group(prefix, opts?)</div>
            <div class="dec-desc">
              Marks a class as a route group. Groups provide a path prefix and
              optional guards that are inherited by all child routes. Groups can
              also be routes themselves (layout pages).
            </div>
            <code-block lang="ts" code={`import { group, route } from "@toyz/loom/router";

@group("/user/:profile", { guards: ["auth"] })
@route("/")
@component("user-layout")
class UserLayout extends LoomElement {
  update() {
    return <div><loom-outlet /></div>;
  }
}

@route("/settings", { group: UserLayout })
@component("user-settings")
class UserSettings extends LoomElement { }
// → resolves to /user/:profile/settings, inherits "auth" guard`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--cyan)"></loom-icon>
            <h2>Route Param Injection</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use <span class="ic">@prop</span> with route options to inject path and query
              parameters directly into reactive properties. Imported from
              <span class="ic">@toyz/loom/router</span>.
            </div>
            <code-block lang="ts" code={`import { params, routeQuery } from "@toyz/loom/router";

// Single path parameter
@prop({ param: "id" }) userId!: string;

// All path params decomposed into a typed object
@prop({params}) routeParams!: { id: string; slug: string };

// Single query parameter  (?tab=settings)
@prop({ query: "tab" }) activeTab!: string;

// All query params decomposed
@prop({ query: routeQuery }) query!: { page: string; sort: string };`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--rose)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@route(path, opts?)</code></td><td>Class</td><td>Register class as route handler</td></tr>
              <tr><td><code>@guard(name?)</code></td><td>Method</td><td>Named guard — return true/false/redirect</td></tr>
              <tr><td><code>@group(prefix, opts?)</code></td><td>Class</td><td>Route group with prefix + inherited guards</td></tr>
              <tr><td><code>@prop({`{ param }`})</code></td><td>Field</td><td>Inject a single path parameter</td></tr>
              <tr><td><code>@prop({`{params}`})</code></td><td>Field</td><td>Decompose all path params into typed object</td></tr>
              <tr><td><code>@prop({`{ query }`})</code></td><td>Field</td><td>Inject a single query parameter</td></tr>
              <tr><td><code>@prop({`{ query: routeQuery }`})</code></td><td>Field</td><td>Decompose all query params into typed object</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
