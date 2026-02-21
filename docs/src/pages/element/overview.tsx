/**
 * Element Overview — /element/overview
 *
 * Base class, shadow DOM, update(), css(), API reference.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>LoomElement</h1>
        <p class="subtitle">The base class for every Loom web component.</p>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--emerald)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">LoomElement</span> extends <span class="ic">HTMLElement</span> and provides Shadow DOM,
              scoped CSS, lifecycle management, and automatic DOM morphing. Every Loom component inherits from it.
            </div>
            <code-block lang="ts" code={`import { LoomElement } from "@toyz/loom";

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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>API Reference</h2>
          </div>
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
              <tr><td><code>shouldUpdate()</code></td><td>() =&gt; boolean</td><td>Return false to skip a render cycle. Default: true</td></tr>
              <tr><td><code>$(sel)</code></td><td>(sel: string) =&gt; Element</td><td>Shorthand for <code>this.shadow.querySelector(sel)</code></td></tr>
              <tr><td><code>$$(sel)</code></td><td>(sel: string) =&gt; Element[]</td><td>Shorthand for <code>Array.from(this.shadow.querySelectorAll(sel))</code></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>The update() Method</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">update()</span> is your render function. It's called whenever a <span class="ic">@reactive</span> property
              changes. Return a JSX node and Loom will morph the shadow DOM to match — only touching elements that actually changed.
            </div>
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
          </div>
          <div class="note">
            If <span class="ic">update()</span> returns <span class="ic">void</span>, no morph occurs — useful when you
            manage the DOM imperatively.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--amber)"></loom-icon>
            <h2>The @component Decorator</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@component(tag)</div>
            <div class="dec-desc">
              Registers a class as a custom element with <span class="ic">customElements.define()</span>.
              It also wires <span class="ic">@prop</span> observed attributes and auto-parsing.
            </div>
            <code-block lang="ts" code={`@component("my-counter")
class MyCounter extends LoomElement {
  @prop accessor label = "Count";
  @reactive accessor count = 0;

  update() {
    return (
      <button onClick={() => this.count++}>
        {this.label}: {this.count}
      </button>
    );
  }
}`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
