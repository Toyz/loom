/**
 * Router — /features/router
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/features/router")
@component("page-router")
export class PageRouter extends LoomElement {
  update() {
    return (
      <div>
        <h1>Router</h1>
        <p class="subtitle">Dual-mode decorator-driven routing with guards, typed params, and outlets.</p>

        <section>
          <h2>Setup</h2>
          <p>
            Create a <span class="ic">LoomRouter</span> with either <span class="ic">hash</span> or <span class="ic">history</span> mode
            and register it with the app:
          </p>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

const router = new LoomRouter({ mode: "hash" }); // or "history"
app.use(router);`}></code-block>
        </section>

        <section>
          <h2>Defining Routes</h2>
          <p>
            Use <span class="ic">@route</span> on any <span class="ic">LoomElement</span> to register it as a routed page.
            Dynamic segments use <span class="ic">:param</span> syntax:
          </p>
          <code-block lang="ts" code={`@route("/users")
@component("page-users")
class PageUsers extends LoomElement {
  update() { return <h1>Users</h1>; }
}

// Dynamic params
@route("/users/:id")
@component("page-user-detail")
class PageUserDetail extends LoomElement { }`}></code-block>
        </section>

        <section>
          <h2>Typed Route Data</h2>
          <p>
            Use <span class="ic">@prop</span> with route options to inject URL params and query strings
            as typed properties. Combine with <span class="ic">@transform</span> for automatic type conversion:
          </p>
          <code-block lang="ts" code={`import { params, routeQuery, transform, typed } from "@toyz/loom";

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
          <h2>Outlet</h2>
          <p>
            <span class="ic">&lt;loom-outlet&gt;</span> renders the matched route's component. Place it where routed
            content should appear. The outlet automatically scrolls to the top on navigation:
          </p>
          <code-block lang="ts" code={`@component("my-app")
class App extends LoomElement {
  update() {
    return (
      <div>
        <nav>...</nav>
        <loom-outlet inherit-styles></loom-outlet>
      </div>
    );
  }
}`}></code-block>
          <p>
            <span class="ic">inherit-styles</span> passes the parent's adopted stylesheets to
            the outlet's child component. Set <span class="ic">scrollToTop="false"</span> to opt out of
            automatic scroll reset.
          </p>
        </section>

        <section>
          <h2>Navigation</h2>
          <p>Navigate declaratively with <span class="ic">&lt;loom-link&gt;</span> or programmatically via the router service:</p>
          <code-block lang="ts" code={`// Declarative
<loom-link to="/users">Users</loom-link>

// Programmatic
import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

app.get(LoomRouter).navigate("/users/123");`}></code-block>
        </section>

        <section>
          <h2>Named Guards</h2>
          <p>
            Guards run before navigation. Define reusable guards with <span class="ic">@guard</span> and reference
            them by name in <span class="ic">@route</span>. Guards support <span class="ic">@inject</span> for
            dependency injection. Return <span class="ic">true</span> to allow, <span class="ic">false</span> to
            block, or a <span class="ic">string</span> to redirect:
          </p>
          <code-block lang="ts" code={`import { service, inject } from "@toyz/loom";
import { guard, route } from "@toyz/loom/router";

@service
class Guards {
  @guard("auth")
  checkAuth(@inject(AuthService) auth: AuthService) {
    return auth.isLoggedIn ? true : "/login";
  }

  @guard("admin")
  checkAdmin(@inject(AuthService) auth: AuthService) {
    return auth.role === "admin" || "/403";
  }
}

@route("/admin", { guards: ["auth", "admin"] })
@component("page-admin")
class PageAdmin extends LoomElement { }`}></code-block>
        </section>

        <section>
          <h2>RouteChanged Event</h2>
          <p>Listen for navigation changes anywhere via the event bus:</p>
          <code-block lang="ts" code={`import { on } from "@toyz/loom";
import { RouteChanged } from "@toyz/loom/router";

@on(RouteChanged)
onRoute(e: RouteChanged) {
  console.log(\`Navigated to \${e.path}\`);
  // e.path, e.params, e.query available
}`}></code-block>
        </section>
      </div>
    );
  }
}
