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
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--emerald)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">@lazy</span> decorator enables code-splitting for any Loom component.
              Instead of bundling all component code upfront, <span class="ic">@lazy</span> defers
              loading the real implementation until the element is first connected to the DOM.
              This is useful for heavy components, route pages, or any element that
              doesn't need to be available immediately.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--accent)"></loom-icon>
            <h2>Basic Usage</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@lazy(loader, opts?)</div>
            <div class="dec-desc">
              Apply <span class="ic">@lazy</span> to any component class. The decorator takes a
              loader function that returns a dynamic <code>import()</code>. The imported module
              should have a <code>default</code> export with the real component class.
            </div>
            <code-block lang="ts" code={`import { LoomElement, component, lazy } from "@toyz/loom";

// Stub — registered immediately, implementation loaded on first mount
@component("heavy-chart")
@lazy(() => import("./components/heavy-chart"))
class HeavyChart extends LoomElement {}

// The real implementation lives in ./components/heavy-chart.ts:
// export default class HeavyChart extends LoomElement {
//   update() { return <canvas>...</canvas>; }
// }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="compass" size={20} color="var(--cyan)"></loom-icon>
            <h2>With Routes</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@lazy</span> pairs naturally with <span class="ic">@route</span> for
              code-split pages. The stub registers the route immediately, but the page
              module only loads when a user navigates to it.
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clock" size={20} color="var(--amber)"></loom-icon>
            <h2>Loading Indicator</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Pass a <span class="ic">loading</span> option to display something while the chunk is
              loading. You can use a tag name string <strong>or a JSX factory</strong> that returns
              a DOM node:
            </div>
            <code-block lang="ts" code={`// Tag name — simple, use a pre-registered component
@component("dashboard-page")
@lazy(() => import("./pages/dashboard"), {
  loading: "app-spinner"
})
class DashboardPage extends LoomElement {}`}></code-block>
            <code-block lang="tsx" code={`// JSX factory — full control, rich loading states
@component("analytics-page")
@lazy(() => import("./pages/analytics"), {
  loading: () => (
    <div class="loading-skeleton">
      <div class="skeleton-header" />
      <div class="skeleton-body" />
    </div>
  )
})
class AnalyticsPage extends LoomElement {}`}></code-block>
            <div class="note">
              Since Loom JSX compiles to real DOM nodes, any component used in the factory
              (like <span class="ic">&lt;my-spinner /&gt;</span>) is a full Loom element with DI,
              reactivity, and all decorators.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--accent)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              When a <span class="ic">@lazy</span>-decorated element is connected to the DOM for
              the first time:
            </div>
          </div>
          <ol>
            <li>The loading indicator is shown (if configured)</li>
            <li>The loader function is called, triggering a dynamic import</li>
            <li>The real class is registered under an internal tag (e.g. <code>my-page-impl</code>)</li>
            <li>A real instance is created and mounted inside the shell's shadow DOM</li>
            <li>Attributes, route params, and adopted styles are forwarded from shell → impl</li>
          </ol>
          <div class="note">
            Subsequent mounts skip the loading step entirely — the module is only loaded once.
            New instances of the same component reuse the shared mount function.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--emerald)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Argument</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>loader</code></td><td><code>() =&gt; Promise</code></td><td>Dynamic import returning {`{ default: Class }`}</td></tr>
              <tr><td><code>opts.loading</code></td><td><code>string | (() =&gt; Node)</code></td><td>Tag name or JSX factory for a loading indicator</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
