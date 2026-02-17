/**
 * Router — Navigation
 * /router/navigation
 */
import { LoomElement, component, mount, css } from "@toyz/loom";
import { docStyles } from "../../styles/doc-page";

const styles = css`
  .api-table {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-4, 1rem) 0;
    font-size: var(--text-sm, 0.8125rem);
  }
  .api-table th,
  .api-table td {
    text-align: left;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
  }
  .api-table th {
    color: var(--text-muted, #5e5e74);
    font-weight: 600;
    font-size: var(--text-xs, 0.75rem);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .api-table td:first-child {
    font-family: var(--font-mono, monospace);
    color: var(--accent, #818cf8);
    font-weight: 500;
    white-space: nowrap;
  }
`;

export default class PageRouterNavigation extends LoomElement {

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [...this.shadow.adoptedStyleSheets, styles];
  }

  update() {
    return (
      <div>
        <h1>Navigation</h1>
        <p class="subtitle">
          Navigate declaratively with <span class="ic">&lt;loom-link&gt;</span> or
          programmatically via the router service.
        </p>

        <section>
          <h2>&lt;loom-link&gt;</h2>
          <p>
            A navigation component that renders an anchor tag. Handles hash vs history mode
            automatically. Adds <span class="ic">.active</span> when the current path matches:
          </p>
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

          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>to</td><td><code>string</code></td><td>Path to navigate to (default: <code>"/"</code>)</td></tr>
              <tr><td>name</td><td><code>string</code></td><td>Named route — overrides <code>to</code> with the resolved path</td></tr>
              <tr><td>params</td><td><code>string</code></td><td>JSON params for named route substitution</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Programmatic Navigation</h2>
          <p>
            Access the router service to navigate from code — event handlers,
            guard redirects, or after async operations:
          </p>
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
        </section>

        <section>
          <h2>Router API</h2>
          <table class="api-table">
            <thead>
              <tr><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td>go(target)</td><td>Navigate to a path or named route, running guards</td></tr>
              <tr><td>navigate(target)</td><td>Alias for <code>go()</code></td></tr>
              <tr><td>replace(target)</td><td>Same as <code>go()</code> but replaces the current history entry</td></tr>
              <tr><td>href(target)</td><td>Build an href string for the current mode (hash or history)</td></tr>
              <tr><td>start()</td><td>Initialize the router — read the current URL and render</td></tr>
              <tr><td>current</td><td>Current route info: <code>path</code>, <code>params</code>, <code>query</code></td></tr>
            </tbody>
          </table>
          <p>
            <strong>Target</strong> can be a <span class="ic">string</span> path or a <span class="ic">{`{ name, params? }`}</span> object for named routes.
          </p>
        </section>

        <section>
          <h2>Active State</h2>
          <p>
            Listen for <span class="ic">RouteChanged</span> events to track the current path and
            style active navigation items. See <loom-link to="/router/overview" style="color: var(--accent)">Overview</loom-link> for
            the event bus pattern.
          </p>
        </section>
      </div>
    );
  }
}
