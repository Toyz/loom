/**
 * Router — Navigation
 * /router/navigation
 */
import { LoomElement, component, mount, css } from "@toyz/loom";
import { route } from "@toyz/loom/router";
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

@route("/router/navigation")
@component("page-router-navigation")
export class PageRouterNavigation extends LoomElement {

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
            automatically. Works anywhere in your component tree:
          </p>
          <code-block lang="tsx" code={`// In any component's update()
<loom-link to="/users">Users</loom-link>
<loom-link to="/users/123">User Detail</loom-link>

// With children
<loom-link to="/settings">
  <loom-icon name="gear" size="16"></loom-icon>
  Settings
</loom-link>`}></code-block>
        </section>

        <section>
          <h2>Programmatic Navigation</h2>
          <p>
            Access the router service to navigate from code — event handlers,
            guard redirects, or after async operations:
          </p>
          <code-block lang="tsx" code={`import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

// Navigate
app.get(LoomRouter).navigate("/users/123");

// Navigate with query params
app.get(LoomRouter).navigate("/search?q=hello");

// From inside a component
@mount
setup() {
  const router = this.app.get(LoomRouter);
  if (!this.isAuthed) router.navigate("/login");
}`}></code-block>
        </section>

        <section>
          <h2>Router API</h2>
          <table class="api-table">
            <thead>
              <tr><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td>navigate(path)</td><td>Navigate to a path, running guards and updating the outlet</td></tr>
              <tr><td>start()</td><td>Initialize the router — read the current URL and render</td></tr>
              <tr><td>current</td><td>Current route info: path, params, query</td></tr>
            </tbody>
          </table>
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
