/**
 * Router — Route Lifecycle  /router/route-lifecycle
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouteLifecycle extends LoomElement {
  update() {
    return (
      <div>
        <h1>Route Lifecycle</h1>
        <p class="subtitle">Run code when entering or leaving a route.</p>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>@onRouteEnter</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@onRouteEnter</div>
            <div class="dec-desc">
              Marks a method to run when the route becomes active. The method
              receives the matched route <span class="ic">params</span> and the merged
              <span class="ic">meta</span> from the route and its group chain.
            </div>
            <code-block lang="ts" code={`import { onRouteEnter } from "@toyz/loom/router";

@route("/user/:id", { meta: { analytics: "user-profile" } })
@component("page-user")
class UserPage extends LoomElement {
  @onRouteEnter
  loadUser(params: Record<string, string>, meta: Record<string, unknown>) {
    fetch(\`/api/users/\${params.id}\`).then(/* ... */);
    analytics.track("page_view", { page: meta.analytics });
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="upload" size={20} color="var(--rose)"></loom-icon>
            <h2>@onRouteLeave</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@onRouteLeave</div>
            <div class="dec-desc">
              Marks a method to run when navigating away from this route.
              Use it for cleanup — cancelling requests, saving drafts, etc.
            </div>
            <code-block lang="ts" code={`import { onRouteLeave } from "@toyz/loom/router";

@route("/editor")
@component("page-editor")
class EditorPage extends LoomElement {
  @onRouteLeave
  saveDraft() {
    localStorage.setItem("draft", this.content);
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--accent)"></loom-icon>
            <h2>Combined Usage</h2>
          </div>
          <div class="feature-entry">
            <code-block lang="ts" code={`@route("/dashboard", { meta: { layout: "full" } })
@component("page-dashboard")
class Dashboard extends LoomElement {
  @onRouteEnter
  entered(params: Record<string, string>, meta: Record<string, unknown>) {
    this.startPolling();
    console.log("Layout:", meta.layout); // "full"
  }

  @onRouteLeave
  left() {
    this.stopPolling();
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--amber)"></loom-icon>
            <h2>Lifecycle Order</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">When navigating from route A to route B:</div>
            <ol>
              <li>Guards for route B are checked</li>
              <li><code>@onRouteLeave</code> fires on route A's element</li>
              <li>Route resolves and <code>RouteChanged</code> event emits</li>
              <li><code>@onRouteEnter</code> fires on route B's element (after DOM update)</li>
            </ol>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--cyan)"></loom-icon>
            <h2>Multiple Handlers</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              You can apply <code>@onRouteEnter</code> or <code>@onRouteLeave</code> to
              multiple methods. All decorated methods will be called in declaration order.
            </div>
          </div>
        </section>
      </div>
    );
  }
}
