/**
 * Element — Light DOM  /element/light-dom
 *
 * Documentation for shadow: false — rendering without shadow DOM.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementLightDom extends LoomElement {
  update() {
    return (
      <div>
        <h1>Light DOM</h1>
        <p class="subtitle">
          Skip shadow DOM encapsulation for leaf components that should inherit parent styles.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sun" size={20} color="var(--amber)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              By default, every Loom component creates a shadow root for style isolation. This is ideal
              for complex, reusable widgets — but leaf components like <strong>buttons</strong>,{" "}
              <strong>icons</strong>, and <strong>badges</strong> often <em>want</em> to inherit styles
              from their parent. Pass <span class="ic">{`{ shadow: false }`}</span> to{" "}
              <span class="ic">@component</span> to render directly into the host element.
            </div>
            <code-block lang="ts" code={`@component("my-button", { shadow: false })
class MyButton extends LoomElement {
  @prop accessor label = "Click me";

  update() {
    return <button class="btn">{this.label}</button>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--cyan)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              When <span class="ic">shadow: false</span> is set, Loom skips{" "}
              <span class="ic">attachShadow()</span> in the constructor. Instead,{" "}
              <span class="ic">this.shadow</span> points to the host element itself.
              All existing APIs work unchanged:
            </div>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>API</th><th>Behavior</th></tr>
            </thead>
            <tbody>
              <tr><td><code>update()</code></td><td>Morphs directly into the host element</td></tr>
              <tr><td><code>$() / $$()</code></td><td>Query the host's subtree</td></tr>
              <tr><td><code>@query / @queryAll</code></td><td>Same as above</td></tr>
              <tr><td><code>@reactive / @prop</code></td><td>Work normally — trigger re-renders</td></tr>
              <tr><td><code>@mount / @unmount</code></td><td>All lifecycle hooks fire as expected</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="palette" size={20} color="var(--rose)"></loom-icon>
            <h2>CSS with Light DOM</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">@styles</span> decorator automatically detects light DOM components
              and adopts stylesheets into the <em>containing root</em> (parent shadow root or document)
              via <span class="ic">adoptedStyleSheets</span>. Use the <strong>tag name</strong> instead
              of <span class="ic">:host</span> as your selector — the <span class="ic">:host</span> pseudo-class
              only works inside shadow DOM.
            </div>
            <code-block lang="ts" code={`const btnStyles = css\`
  my-button {
    display: inline-block;
  }
  my-button .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    background: var(--accent);
    color: white;
    border: none;
    cursor: pointer;
  }
\`;

@component("my-button", { shadow: false })
@styles(btnStyles)
class MyButton extends LoomElement { ... }`}></code-block>
          </div>

          <div class="callout">
            <strong>Note:</strong> Use the component's tag name (e.g. <code>my-button</code>) instead
            of <code>:host</code> in your CSS selectors. The <code>:host</code> pseudo-class only works inside shadow DOM.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="star" size={20} color="var(--emerald)"></loom-icon>
            <h2>Built-in Example: loom-icon</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Loom's built-in <span class="ic">&lt;loom-icon&gt;</span> component uses light DOM rendering.
              Icons automatically inherit <span class="ic">color</span> from their parent and skip
              unnecessary shadow root overhead:
            </div>
            <code-block lang="tsx" code={`// loom-icon renders as light DOM by default
<loom-icon name="bolt" size={20} />

// It inherits currentColor from the parent —
// no CSS custom properties or ::part() needed!`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="compass" size={20} color="var(--accent)"></loom-icon>
            <h2>When to Use</h2>
          </div>
          <div class="grid">
            <div class="card">
              <h3><loom-icon name="check" size={16} color="var(--emerald)"></loom-icon> Use Light DOM</h3>
              <ul>
                <li>Icons, buttons, badges, tags</li>
                <li>Components that should inherit parent styles</li>
                <li>Leaf nodes with no complex internal DOM</li>
                <li>Elements that need <code>currentColor</code> inheritance</li>
              </ul>
            </div>
            <div class="card">
              <h3><loom-icon name="x" size={16} color="var(--rose)"></loom-icon> Keep Shadow DOM</h3>
              <ul>
                <li>Complex widgets (modals, date pickers)</li>
                <li>Components with internal state and scoped styles</li>
                <li>Reusable library components</li>
                <li>Anything that should be fully encapsulated</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
