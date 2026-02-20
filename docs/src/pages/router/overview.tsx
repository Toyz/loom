/**
 * Router — Overview
 * /router/overview
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>Router Overview</h1>
        <p class="subtitle">
          Dual-mode decorator-driven routing with guards, typed params, and outlets.
          Import from <span class="ic">@toyz/loom/router</span>.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>Setup</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Create a <span class="ic">LoomRouter</span> with either <span class="ic">hash</span> or <span class="ic">history</span> mode
              and register it with the app:
            </div>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

const router = new LoomRouter({ mode: "hash" });
app.use(router);
app.start();
router.start();`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="compass" size={20} color="var(--amber)"></loom-icon>
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
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">hash</span> mode is zero-config and works on static hosts.
              <span class="ic">history</span> mode gives clean URLs but requires your server to serve
              <span class="ic">index.html</span> for all routes.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--accent)"></loom-icon>
            <h2>Outlet</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">&lt;loom-outlet&gt;</span> renders the matched route's component.
              Place it where routed content should appear:
            </div>
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
          </div>
          <div class="note">
            <span class="ic">inherit-styles</span> passes the parent's adopted stylesheets to
            the routed component. Set <span class="ic">scrollToTop="false"</span> to opt out of
            automatic scroll reset on navigation.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--cyan)"></loom-icon>
            <h2>RouteChanged Event</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">Listen for navigation changes anywhere via the event bus:</div>
            <code-block lang="tsx" code={`import { on } from "@toyz/loom";
import { RouteChanged } from "@toyz/loom/router";

@on(RouteChanged)
onRoute(e: RouteChanged) {
  console.log(\`Navigated to \${e.path}\`);
  // e.path, e.params, e.query available
}`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
