/**
 * Router — Navigation
 * /router/navigation
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterNavigation extends LoomElement {
  update() {
    return (
      <div>
        <h1>Navigation</h1>
        <p class="subtitle">
          Navigate declaratively with <span class="ic">&lt;loom-link&gt;</span> or
          programmatically via the router service.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="link" size={20} color="var(--emerald)"></loom-icon>
            <h2>&lt;loom-link&gt;</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              A navigation component that renders an anchor tag. Handles hash vs history mode
              automatically. Adds <span class="ic">.active</span> when the current path matches:
            </div>
            <code-block lang="tsx" code={`// Navigate by path
<loom-link to="/users">Users</loom-link>
<loom-link to="/users/123">User Detail</loom-link>

// Navigate by named route
<loom-link name="user-detail" params='{"id":"123"}'>
  User Detail
</loom-link>

// With children
<loom-link to="/settings">
  <loom-icon name="gear" size="16"></loom-icon>
  Settings
</loom-link>`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">to</span></td><td><code>string</code></td><td>Path to navigate to (default: <code>"/"</code>)</td></tr>
              <tr><td><span class="ic">name</span></td><td><code>string</code></td><td>Named route — overrides <code>to</code> with the resolved path</td></tr>
              <tr><td><span class="ic">params</span></td><td><code>string</code></td><td>JSON params for named route substitution</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--accent)"></loom-icon>
            <h2>Programmatic Navigation</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Access the router service to navigate from code — event handlers,
              guard redirects, or after async operations:
            </div>
            <code-block lang="tsx" code={`import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

const router = app.get(LoomRouter);

// Navigate by path
router.go("/users/123");

// Navigate by named route
router.go({ name: "user-detail", params: { id: "123" } });

// Replace without history entry
router.replace("/login");

// Build an href (respects hash/history mode)
router.href({ name: "user-detail", params: { id: "42" } });

// From inside a component
@mount
setup() {
  const router = this.app.get(LoomRouter);
  if (!this.isAuthed) router.go("/login");
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--amber)"></loom-icon>
            <h2>Router API</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><span class="ic">go(target)</span></td><td>Navigate to a path or named route, running guards</td></tr>
              <tr><td><span class="ic">navigate(target)</span></td><td>Alias for <code>go()</code></td></tr>
              <tr><td><span class="ic">replace(target)</span></td><td>Same as <code>go()</code> but replaces the current history entry</td></tr>
              <tr><td><span class="ic">href(target)</span></td><td>Build an href string for the current mode (hash or history)</td></tr>
              <tr><td><span class="ic">start()</span></td><td>Initialize the router — read the current URL and render</td></tr>
              <tr><td><span class="ic">current</span></td><td>Current route info: <code>path</code>, <code>params</code>, <code>query</code></td></tr>
            </tbody>
          </table>
          <div class="note">
            <strong>Target</strong> can be a <span class="ic">string</span> path or a <span class="ic">{`{ name, params? }`}</span> object for named routes.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--cyan)"></loom-icon>
            <h2>Active State</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Listen for <span class="ic">RouteChanged</span> events to track the current path and
              style active navigation items. See <loom-link to="/router/overview" style="color: var(--accent)">Overview</loom-link> for
              the event bus pattern.
            </div>
          </div>
        </section>
      </div>
    );
  }
}
