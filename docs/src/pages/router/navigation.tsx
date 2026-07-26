/**
 * Router — Navigation
 * /router/navigation
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterNavigation extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Navigation" subtitle="Navigate declaratively with <loom-link> or programmatically via the router service."></doc-header>

        <section>
          <p>An SPA link has to be a real <span class="ic">&lt;a href&gt;</span> — so it can be middle-clicked, copied, opened in a new tab, and read by a crawler — while still not reloading the page on a plain left click. A <span class="ic">div</span> with an onClick fails every one of those.</p>
          <p><span class="ic">&lt;loom-link&gt;</span> renders a real anchor with a real href and intercepts only the clicks it should: plain left clicks, with no modifier held. Anything else is left to the browser, which is what the user was asking for.</p>
          <punch-matrix
            columns="REAL ANCHOR,NEW HISTORY ENTRY,REPLACES CURRENT,OPENS IN A NEW TAB"
            rows={[
              { name: `<loom-link to>`, punches: "REAL ANCHOR,NEW HISTORY ENTRY,OPENS IN A NEW TAB", note: "Middle-click and copy-link both work" },
              { name: "router.go(path)", punches: "NEW HISTORY ENTRY", note: "Programmatic, back button returns" },
              { name: "router.replace()", punches: "REPLACES CURRENT", note: "Back skips the page you left" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="&lt;loom-link&gt;">
            <p>
              A navigation component that renders an anchor tag. Handles hash vs history mode
              automatically. Adds <span class="ic">.active</span> when the current path matches:
            </p>
            <code-block lang="tsx" code={`// Navigate by path
<loom-link to="/users">Users</loom-link>
<loom-link to="/users/123">User Detail</loom-link>

// Navigate by named route
<loom-link name="user-detail" params='{"id":"123"}'>
  User Detail
</loom-link>

// With children
<loom-link to="/settings">
  <loom-icon name="gear" size="16"></loom-icon>
  Settings
</loom-link>`}></code-block>

          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">to</span></td><td><code>string</code></td><td>Path to navigate to (default: <code>"/"</code>)</td></tr>
              <tr><td><span class="ic">name</span></td><td><code>string</code></td><td>Named route — overrides <code>to</code> with the resolved path</td></tr>
              <tr><td><span class="ic">params</span></td><td><code>string</code></td><td>JSON params for named route substitution</td></tr>
              <tr><td><span class="ic">styles</span></td><td><code>CSSStyleSheet[]</code></td><td>Extra stylesheets adopted into the shadow root — override anchor display, sizing, etc.</td></tr>
            </tbody>
          </table>

            <p>
              Use <span class="ic">styles</span> to override the internal anchor's CSS. For example, for inline text flow or full-width nav cards:
            </p>
            <code-block lang="tsx" code={`import { css } from "@toyz/loom";

// Inline in flowing text
const inline = css\`a { display: inline; }\`;
<loom-link to="/foo" styles={[inline]}>Foo</loom-link>

// Full-width clickable card
const fill = css\`a { display: flex; width: 100%; height: 100%; }\`;
<loom-link to="/bar" styles={[fill]} class="card">
  <span>Bar</span>
</loom-link>`}></code-block>
        </doc-section>
        <doc-section heading="Programmatic Navigation">
            <p>
              Access the router service to navigate from code — event handlers,
              guard redirects, or after async operations:
            </p>
            <code-block lang="tsx" code={`import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

const router = app.get(LoomRouter);

// Navigate by path
router.go("/users/123");

// Navigate by named route
router.go({ name: "user-detail", params: { id: "123" } });

// Replace without history entry
router.replace("/login");

// Build an href (respects hash/history mode)
router.href({ name: "user-detail", params: { id: "42" } });

// From inside a component
@mount
setup() {
  const router = this.app.get(LoomRouter);
  if (!this.isAuthed) router.go("/login");
}`}></code-block>
        </doc-section>
        <doc-section heading="Router API">
          <table class="api-table">
            <thead>
              <tr><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><span class="ic">go(target)</span></td><td>Navigate to a path or named route, running guards</td></tr>
              <tr><td><span class="ic">navigate(target)</span></td><td>Alias for <code>go()</code></td></tr>
              <tr><td><span class="ic">replace(target)</span></td><td>Same as <code>go()</code> but replaces the current history entry</td></tr>
              <tr><td><span class="ic">href(target)</span></td><td>Build an href string for the current mode (hash or history)</td></tr>
              <tr><td><span class="ic">start()</span></td><td>Initialize the router — read the current URL and render</td></tr>
              <tr><td><span class="ic">current</span></td><td>Current route info: <code>path</code>, <code>params</code>, <code>query</code></td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            <strong>Target</strong> can be a <span class="ic">string</span> path or a <span class="ic">{`{ name, params? }`}</span> object for named routes.
          </doc-notification>
        </doc-section>
        <doc-section heading="Active State">
            <p>
              Listen for <span class="ic">RouteChanged</span> events to track the current path and
              style active navigation items. See <loom-link to="/router/overview" style="color: var(--accent)">Overview</loom-link> for
              the event bus pattern.
            </p>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
