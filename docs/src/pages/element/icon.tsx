/**
 * Icon — /element/icon
 *
 * LoomIcon built-in element documentation.
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { ElementGroup } from "../../groups";

@route("/icon", { group: ElementGroup })
@component("page-element-icon")
export class PageElementIcon extends LoomElement {
  update() {
    return (
      <div>
        <h1>Icon</h1>
        <p class="subtitle">SVG icon system with lazy registration.</p>

        <section>
          <h2>Overview</h2>
          <p>
            <span class="ic">&lt;loom-icon&gt;</span> is a built-in custom element for rendering inline SVG icons.
            Icons are registered by name, rendered into shadow DOM, and styled via CSS custom properties.
          </p>
          <p>
            Like <span class="ic">LoomVirtual</span>, <span class="ic">LoomIcon</span> is excluded from the main barrel
            to avoid side effects. Import it explicitly to register the element:
          </p>
          <code-block lang="ts" code={`import { LoomIcon } from "@toyz/loom/element/icon";`}></code-block>
        </section>

        <section>
          <h2>Registering Icons</h2>
          <p>
            Register icons with <span class="ic">LoomIcon.register()</span> for single icons or
            <span class="ic">LoomIcon.registerAll()</span> for batch registration:
          </p>
          <code-block lang="ts" code={`// Single icon
LoomIcon.register("home", '<path d="M3 12l9-9 9 9..." />');

// Batch registration
LoomIcon.registerAll({
  home:   '<path d="M3 12l9-9 9 9..." />',
  search: '<path d="M21 21l-6-6m2-5a7 7 0 11-14..." />',
  close:  '<path d="M18 6L6 18M6 6l12 12" />',
});`}></code-block>
          <p>
            Register icons early in your app's entry point — before any component that uses
            <span class="ic">&lt;loom-icon&gt;</span> renders.
          </p>
        </section>

        <section>
          <h2>Usage</h2>
          <p>Use the element in JSX or HTML with the <span class="ic">name</span> attribute:</p>
          <code-block lang="ts" code={`// In JSX
<loom-icon name="home" size={20} color="var(--accent)"></loom-icon>

// In HTML
<loom-icon name="search" size="16" color="#888"></loom-icon>`}></code-block>
        </section>

        <section>
          <h2>API</h2>
          <table class="api-table">
            <thead><tr><th>Attribute / Property</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td>string</td><td>Name of the registered icon to render</td></tr>
              <tr><td><code>size</code></td><td>number</td><td>Width and height in pixels (default: 24)</td></tr>
              <tr><td><code>color</code></td><td>string</td><td>CSS color for the icon (default: currentColor)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Static Methods</h2>
          <table class="api-table">
            <thead><tr><th>Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>LoomIcon.register(name, svg)</code></td><td>Register a single icon by name</td></tr>
              <tr><td><code>LoomIcon.registerAll(map)</code></td><td>Register multiple icons at once</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Styling</h2>
          <p>
            Icons inherit <span class="ic">currentColor</span> by default, so they respond to the parent's
            text color. Override with the <span class="ic">color</span> attribute or CSS:
          </p>
          <code-block lang="ts" code={`/* Icons inherit text color */
.nav-item { color: #888; }
.nav-item:hover { color: #fff; }

/* Or set explicitly */
<loom-icon name="bolt" color="var(--amber)"></loom-icon>`}></code-block>
        </section>
      </div>
    );
  }
}
