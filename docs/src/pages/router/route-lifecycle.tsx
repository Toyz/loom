/**
 * Router — Route Lifecycle  /router/route-lifecycle
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { RouterGroup } from "../../groups";

@route("/route-lifecycle", { group: RouterGroup })
@component("page-route-lifecycle")
export class PageRouteLifecycle extends LoomElement {
  update() {
    return (
      <div>
        <h1>Route Lifecycle</h1>
        <p class="subtitle">Run code when entering or leaving a route.</p>

        <section>
          <h2>@onRouteEnter</h2>
          <p>
            Marks a method to run when the route becomes active. The method
            receives the matched route <span class="ic">params</span>.
          </p>
          <code-block lang="ts" code={`import { onRouteEnter } from "@toyz/loom/router";

@route("/user/:id")
@component("page-user")
class UserPage extends LoomElement {
  @onRouteEnter
  loadUser(params: Record<string, string>) {
    fetch(\`/api/users/\${params.id}\`).then(/* ... */);
  }
}`}></code-block>
        </section>

        <section>
          <h2>@onRouteLeave</h2>
          <p>
            Marks a method to run when navigating away from this route.
            Use it for cleanup — cancelling requests, saving drafts, etc.
          </p>
          <code-block lang="ts" code={`import { onRouteLeave } from "@toyz/loom/router";

@route("/editor")
@component("page-editor")
class EditorPage extends LoomElement {
  @onRouteLeave
  saveDraft() {
    localStorage.setItem("draft", this.content);
  }
}`}></code-block>
        </section>

        <section>
          <h2>Combined Usage</h2>
          <code-block lang="ts" code={`@route("/dashboard")
@component("page-dashboard")
class Dashboard extends LoomElement {
  @onRouteEnter
  entered(params: Record<string, string>) {
    this.startPolling();
  }

  @onRouteLeave
  left() {
    this.stopPolling();
  }
}`}></code-block>
        </section>

        <section>
          <h2>Lifecycle Order</h2>
          <p>When navigating from route A to route B:</p>
          <ol>
            <li>Guards for route B are checked</li>
            <li><code>@onRouteLeave</code> fires on route A's element</li>
            <li>Route resolves and <code>RouteChanged</code> event emits</li>
            <li><code>@onRouteEnter</code> fires on route B's element (after DOM update)</li>
          </ol>
        </section>

        <section>
          <h2>Multiple Handlers</h2>
          <p>
            You can apply <code>@onRouteEnter</code> or <code>@onRouteLeave</code> to
            multiple methods. All decorated methods will be called in declaration order.
          </p>
        </section>
      </div>
    );
  }
}
