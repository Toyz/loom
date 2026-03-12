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
        <doc-header title="Lazy Loading" subtitle="Defer component module loading until first mount with @lazy."></doc-header>

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
            <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";
import { lazy } from "@toyz/loom/element";

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
            <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";
import { lazy } from "@toyz/loom/element";
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
            <doc-notification type="note">
              Since Loom JSX compiles to real DOM nodes, any component used in the factory
              (like <span class="ic">&lt;my-spinner /&gt;</span>) is a full Loom element with DI,
              reactivity, and all decorators.
            </doc-notification>
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
          <doc-notification type="note">
            Subsequent mounts skip the loading step entirely — the module is only loaded once.
            New instances of the same component reuse the shared mount function.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--rose)"></loom-icon>
            <h2>Events</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@lazy</span> emits global events over the bus so any component can react
              to loading state — show progress bars, dim backgrounds, or track metrics.
            </div>
            <code-block lang="tsx" code={`import { LoomElement, on } from "@toyz/loom";
import { LazyLoadStart, LazyLoadEnd } from "@toyz/loom/element";

@on(LazyLoadStart)
onLazyStart(e: LazyLoadStart) {
  console.log(\`Loading <\${e.tag}>…\`);
  this.showProgressBar = true;
}

@on(LazyLoadEnd)
onLazyEnd(e: LazyLoadEnd) {
  this.showProgressBar = false;
  if (!e.success) {
    console.error(\`<\${e.tag}> failed in \${e.duration}ms\`, e.error);
  }
}`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Event</th><th>Property</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td rowSpan={1}><span class="ic">LazyLoadStart</span></td><td><code>tag</code></td><td><code>string</code></td><td>Custom element tag name being loaded</td></tr>
              <tr><td rowSpan={4}><span class="ic">LazyLoadEnd</span></td><td><code>tag</code></td><td><code>string</code></td><td>Custom element tag name</td></tr>
              <tr><td><code>success</code></td><td><code>boolean</code></td><td><code>true</code> if module loaded successfully</td></tr>
              <tr><td><code>duration</code></td><td><code>number</code></td><td>Milliseconds elapsed during load</td></tr>
              <tr><td><code>error</code></td><td><code>unknown?</code></td><td>Error object when <code>success</code> is <code>false</code></td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            Events are only emitted on the <strong>first load</strong> of a module. Cached re-mounts
            skip the loader entirely and do not emit events.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="eye" size={20} color="var(--cyan)"></loom-icon>
            <h2>Viewport Trigger</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              By default, <span class="ic">@lazy</span> loads the module as soon as the element is
              connected to the DOM. With <span class="ic">trigger: 'viewport'</span>, loading is
              deferred until the element scrolls near the viewport — powered by
              <code>IntersectionObserver</code>.
            </div>
            <code-block lang="ts" code={`@component("heavy-chart")
@lazy(() => import("./components/heavy-chart"), {
  trigger: 'viewport',       // load when near-visible
  rootMargin: '300px',       // start 300px before visible (default: 200px)
  loading: 'chart-skeleton'  // show skeleton while off-screen
})
class HeavyChart extends LoomElement {}`}></code-block>
          </div>
          <doc-notification type="note">
            The observer is automatically cleaned up — disconnected and nulled — both after the
            load fires <strong>and</strong> if the element is removed from the DOM before loading.
            No manual cleanup needed.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--amber)"></loom-icon>
            <h2>Prefetch</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Every <span class="ic">@lazy</span> class exposes a static
              <span class="ic">.prefetch()</span> method that warms the import cache before mount.
              Pairs naturally with hover states, route predictions, or idle callbacks.
            </div>
            <code-block lang="ts" code={`// Warm the cache on hover — instant mount when user navigates
navLink.addEventListener('mouseenter', () => {
  SettingsPage.prefetch();
});

// Or prefetch during idle time
requestIdleCallback(() => {
  DashboardPage.prefetch();
  AnalyticsPage.prefetch();
});`}></code-block>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">.prefetch()</span> is idempotent — calling it multiple times returns the
              same cached promise. When the element mounts, it reuses the prefetched module instead of
              calling the loader again.
            </div>
          </div>
          <doc-notification type="tip">
            Combine <span class="ic">prefetch</span> with <span class="ic">trigger: 'viewport'</span>
            for the best of both worlds: start downloading the chunk early, then mount instantly when
            the element scrolls into view. The observer is skipped entirely if the chunk is already
            cached.
          </doc-notification>
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
              <tr><td><code>opts.error</code></td><td><code>string | (() =&gt; Node)</code></td><td>Tag name or JSX factory for an error fallback</td></tr>
              <tr><td><code>opts.trigger</code></td><td><code>'mount' | 'viewport'</code></td><td>When to load — on DOM connect (default) or viewport intersection</td></tr>
              <tr><td><code>opts.rootMargin</code></td><td><code>string</code></td><td>IntersectionObserver margin for viewport trigger (default: <code>'200px'</code>)</td></tr>
            </tbody>
          </table>

          <div class="group-header" style="margin-top: 24px">
            <loom-icon name="zap" size={18} color="var(--text-muted)"></loom-icon>
            <h3>Static Methods</h3>
          </div>
          <table class="api-table">
            <thead><tr><th>Method</th><th>Returns</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>MyClass.prefetch()</code></td><td><code>Promise</code></td><td>Pre-warm the import cache. Idempotent — multiple calls return the same promise.</td></tr>
            </tbody>
          </table>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
