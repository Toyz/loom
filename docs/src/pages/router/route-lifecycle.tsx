/**
 * Router — Route Lifecycle  /router/route-lifecycle
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouteLifecycle extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Route Lifecycle" subtitle="Run code when entering or leaving a route."></doc-header>

        <section>
          <p>Mount and route entry are not the same event, and treating them as one is how you get an analytics page-view that fires twice, or a data load that does not fire at all when only the params changed.</p>
          <p><span class="ic">@onRouteEnter</span> and <span class="ic">@onRouteLeave</span> fire on the route transition and receive the matched params and merged meta. A component reused across two URLs of the same pattern gets an enter for each, without a remount in between.</p>
        </section>

        <doc-section heading="@onRouteEnter">
          <api-entry sig="@onRouteEnter">
            <p>
              Marks a method to run when the route becomes active. The method
              receives the matched route <span class="ic">params</span> and the merged <span class="ic">meta</span> from the route and its group chain.
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="@onRouteLeave">
          <api-entry sig="@onRouteLeave">
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
          </api-entry>
        </doc-section>
        <doc-section heading="Combined Usage">
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
        </doc-section>
        <doc-section heading="Lifecycle Order">
            <p>When navigating from route A to route B:</p>
            <ol>
              <li>Guards for route B are checked</li>
              <li><code>@onRouteLeave</code> fires on route A's element</li>
              <li>Route resolves and <code>RouteChanged</code> event emits</li>
              <li><code>@onRouteEnter</code> fires on route B's element (after DOM update)</li>
            </ol>
        </doc-section>
        <doc-section heading="Multiple Handlers">
            <p>
              You can apply <code>@onRouteEnter</code> or <code>@onRouteLeave</code> to
              multiple methods. All decorated methods will be called in declaration order.
            </p>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
