/**
 * Router — Overview
 * /router/overview
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterOverview extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Router Overview" subtitle="Dual-mode decorator-driven routing with guards, typed params, and outlets. Import from @toyz/loom/router."></doc-header>

        <section>
          <p>Routing is mostly one question asked repeatedly: given this URL, which component, and is this person allowed to see it. Everything else — params, query, transitions, code splitting — hangs off that.</p>
          <p>Loom answers it with decorators on the component itself, so a route lives next to the thing it renders rather than in a table somewhere else that has to be kept in sync. It runs in hash or history mode, and the choice affects your server config rather than your code.</p>
        </section>

        <section>
          <div class="group-header">
            <h2>Setup</h2>
          </div>
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
          <div class="group-header">
            <h2>Modes</h2>
          </div>
          <table class="api-table">
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
          <div class="group-header">
            <h2>Outlet</h2>
          </div>
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
          <doc-notification type="note">
            <span class="ic">inherit-styles</span> passes the parent's adopted stylesheets to
            the routed component. Set <span class="ic">scrollToTop="false"</span> to opt out of
            automatic scroll reset on navigation.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <h2>RouteChanged Event</h2>
          </div>
            <p>Listen for navigation changes anywhere via the event bus:</p>
            <code-block lang="tsx" code={`import { on } from "@toyz/loom";
import { RouteChanged } from "@toyz/loom/router";

@on(RouteChanged)
onRoute(e: RouteChanged) {
  console.log(\`Navigated to \${e.path}\`);
  // e.path, e.params, e.query available
}`}></code-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
