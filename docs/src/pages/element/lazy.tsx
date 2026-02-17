/**
 * Element — Lazy Loading  /element/lazy
 *
 * @lazy decorator for code-splitting any component.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementLazy extends LoomElement {
  update() {
    return (
      <div>
        <h1>Lazy Loading</h1>
        <p class="subtitle">Defer component module loading until first mount with <span class="ic">@lazy</span>.</p>

        <section>
          <h2>Overview</h2>
          <p>
            The <span class="ic">@lazy</span> decorator enables code-splitting for any Loom component.
            Instead of bundling all component code upfront, <span class="ic">@lazy</span> defers
            loading the real implementation until the element is first connected to the DOM.
            This is useful for heavy components, route pages, or any element that
            doesn't need to be available immediately.
          </p>
        </section>

        <section>
          <h2>Basic Usage</h2>
          <p>
            Apply <span class="ic">@lazy</span> to any component class. The decorator takes a
            loader function that returns a dynamic <code>import()</code>. The imported module
            should have a <code>default</code> export with the real component class.
          </p>
          <code-block lang="ts" code={`import { LoomElement, component, lazy } from "@toyz/loom";

// Stub — registered immediately, implementation loaded on first mount
@component("heavy-chart")
@lazy(() => import("./components/heavy-chart"))
class HeavyChart extends LoomElement {}

// The real implementation lives in ./components/heavy-chart.ts:
// export default class HeavyChart extends LoomElement {
//   update() { return <canvas>...</canvas>; }
// }`}></code-block>
        </section>

        <section>
          <h2>With Routes</h2>
          <p>
            <span class="ic">@lazy</span> pairs naturally with <span class="ic">@route</span> for
            code-split pages. The stub registers the route immediately, but the page
            module only loads when a user navigates to it.
          </p>
          <code-block lang="ts" code={`import { LoomElement, component, lazy } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/settings")
@component("page-settings")
@lazy(() => import("./pages/settings"))
class PageSettings extends LoomElement {}

@route("/admin", { guards: ["auth"] })
@component("page-admin")
@lazy(() => import("./pages/admin"))
class PageAdmin extends LoomElement {}`}></code-block>
        </section>

        <section>
          <h2>Loading Indicator</h2>
          <p>
            Pass a <span class="ic">loading</span> option with the tag name of a component to
            display while the chunk is fetching:
          </p>
          <code-block lang="ts" code={`@component("dashboard-page")
@lazy(() => import("./pages/dashboard"), {
  loading: "app-spinner"
})
class DashboardPage extends LoomElement {}`}></code-block>
        </section>

        <section>
          <h2>How It Works</h2>
          <p>
            When a <span class="ic">@lazy</span>-decorated element is connected to the DOM for
            the first time:
          </p>
          <ol>
            <li>The loading indicator is shown (if configured)</li>
            <li>The loader function is called, triggering a dynamic import</li>
            <li>The real class's prototype methods and static properties are patched onto the stub</li>
            <li>The loading indicator is cleared and the real <span class="ic">connectedCallback</span> runs</li>
          </ol>
          <p>
            Subsequent mounts skip the loading step entirely — the module is only loaded once.
          </p>
        </section>

        <section>
          <h2>API Reference</h2>
          <table class="api-table">
            <thead><tr><th>Argument</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>loader</code></td><td><code>() =&gt; Promise</code></td><td>Dynamic import returning {`{ default: Class }`}</td></tr>
              <tr><td><code>opts.loading</code></td><td><code>string</code></td><td>Tag name of a loading component to show</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
