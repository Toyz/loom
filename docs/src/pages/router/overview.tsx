/**
 * Router — Overview
 * /router/overview
 */
import { LoomElement, mount, css } from "@toyz/loom";
import { docStyles } from "../../styles/doc-page";

const styles = css`
  .mode-table {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-4, 1rem) 0;
    font-size: var(--text-sm, 0.8125rem);
  }
  .mode-table th,
  .mode-table td {
    text-align: left;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
  }
  .mode-table th {
    color: var(--text-muted, #5e5e74);
    font-weight: 600;
    font-size: var(--text-xs, 0.75rem);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .mode-table td:first-child {
    font-family: var(--font-mono, monospace);
    color: var(--accent, #818cf8);
    font-weight: 500;
  }
`;

export default class PageRouterOverview extends LoomElement {

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [...this.shadow.adoptedStyleSheets, styles];
  }

  update() {
    return (
      <div>
        <h1>Router Overview</h1>
        <p class="subtitle">
          Dual-mode decorator-driven routing with guards, typed params, and outlets.
          Import from <span class="ic">@toyz/loom/router</span>.
        </p>

        <section>
          <h2>Setup</h2>
          <p>
            Create a <span class="ic">LoomRouter</span> with either <span class="ic">hash</span> or <span class="ic">history</span> mode
            and register it with the app:
          </p>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

const router = new LoomRouter({ mode: "hash" });
app.use(router);
app.start();
router.start();`}></code-block>
        </section>

        <section>
          <h2>Modes</h2>
          <table class="mode-table">
            <thead>
              <tr><th>Mode</th><th>URL Shape</th><th>Requires Server</th></tr>
            </thead>
            <tbody>
              <tr><td>hash</td><td>example.com/#/users/123</td><td>No</td></tr>
              <tr><td>history</td><td>example.com/users/123</td><td>Yes (SPA fallback)</td></tr>
            </tbody>
          </table>
          <p>
            <span class="ic">hash</span> mode is zero-config and works on static hosts.
            <span class="ic">history</span> mode gives clean URLs but requires your server to serve
            <span class="ic">index.html</span> for all routes.
          </p>
        </section>

        <section>
          <h2>Outlet</h2>
          <p>
            <span class="ic">&lt;loom-outlet&gt;</span> renders the matched route's component.
            Place it where routed content should appear:
          </p>
          <code-block lang="tsx" code={`@component("my-app")
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
            the routed component. Set <span class="ic">scrollToTop="false"</span> to opt out of
            automatic scroll reset on navigation.
          </p>
        </section>

        <section>
          <h2>RouteChanged Event</h2>
          <p>Listen for navigation changes anywhere via the event bus:</p>
          <code-block lang="tsx" code={`import { on } from "@toyz/loom";
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
