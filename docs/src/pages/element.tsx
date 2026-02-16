/**
 * LoomElement — /core/element
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/core/element")
@component("page-element")
export class PageElement extends LoomElement {
  update() {
    return (
      <div>
        <h1>LoomElement</h1>
        <p class="subtitle">The base class for every Loom web component.</p>

        <section>
          <h2>Overview</h2>
          <p>
            <span class="ic">LoomElement</span> extends <span class="ic">HTMLElement</span> and provides Shadow DOM,
            scoped CSS, lifecycle management, and automatic DOM morphing. Every Loom component inherits from it.
          </p>
          <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";

@component("my-widget")
export class MyWidget extends LoomElement {
  update() {
    this.css\`
      :host { display: block; padding: 16px; }
      p { color: #888; }
    \`;
    return <p>Hello from a Loom component!</p>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>API Reference</h2>
          <table class="api-table">
            <thead>
              <tr><th>Member</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>shadow</code></td><td>ShadowRoot</td><td>The component's open shadow root</td></tr>
              <tr><td><code>update()</code></td><td>() =&gt; Node | void</td><td>Render method — return JSX or void. Called on every reactive change.</td></tr>
              <tr><td><code>css``</code></td><td>tagged template</td><td>Scoped CSS — adopted into the shadow root as a <code>CSSStyleSheet</code></td></tr>
              <tr><td><code>scheduleUpdate()</code></td><td>() =&gt; void</td><td>Manually trigger a re-render on the next animation frame</td></tr>
              <tr><td><code>firstUpdated()</code></td><td>() =&gt; void</td><td>Called once after the first render</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>The update() Method</h2>
          <p>
            <span class="ic">update()</span> is your render function. It's called whenever a <span class="ic">@reactive</span> property
            changes. Return a JSX node and Loom will morph the shadow DOM to match — only touching elements that actually changed.
          </p>
          <code-block lang="ts" code={`update() {
  // CSS is set once, then cached
  this.css\`p { color: var(--accent); }\`;

  // JSX compiles to real DOM nodes
  return (
    <div>
      <p>Count: {this.count}</p>
      <button onClick={() => this.count++}>+1</button>
    </div>
  );
}`}></code-block>
          <p>
            If <span class="ic">update()</span> returns <span class="ic">void</span>, no morph occurs — useful when you
            manage the DOM imperatively.
          </p>
        </section>

        <section>
          <h2>Lifecycle</h2>
          <p>
            Use <span class="ic">@mount</span> and <span class="ic">@unmount</span> decorators for lifecycle hooks — they're
            the recommended approach over raw <span class="ic">connectedCallback</span>/<span class="ic">disconnectedCallback</span>:
          </p>
          <code-block lang="ts" code={`@component("my-el")
class MyEl extends LoomElement {
  @mount
  setup() {
    console.log("connected");
    this.shadow.adoptedStyleSheets = [styles];
  }

  @unmount
  teardown() {
    console.log("disconnected");
  }

  // One-time setup after first render
  firstUpdated() {
    this.querySelector("input")?.focus();
  }
}`}></code-block>
        </section>
      </div>
    );
  }
}
