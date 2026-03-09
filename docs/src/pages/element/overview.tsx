/**
 * Element Overview — /element/overview
 *
 * Base class, shadow DOM, update(), @styles, API reference.
 */
import { LoomElement } from "@toyz/loom";
import { inlineLink } from "../../styles/doc-page";

export default class PageElementOverview extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="LoomElement" subtitle="The base class for every Loom web component."></doc-header>

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
            <code-block lang="ts" code={`import { LoomElement, component, styles, css } from "@toyz/loom";

const sheet = css\`
  :host { display: block; padding: 16px; }
  p { color: #888; }
\`;

@component("my-widget")
@styles(sheet)
export class MyWidget extends LoomElement {
  update() {
    return <p>Hello from a Loom component!</p>;
  }
}`}></code-block>
          </div>
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
  return (
    <div>
      <p>Count: {this.count}</p>
      <button onClick={() => this.count++}>+1</button>
    </div>
  );
}`}></code-block>
          </div>
          <doc-notification type="note">
            If <span class="ic">update()</span> returns <span class="ic">void</span>, no morph occurs — useful when you
            manage the DOM imperatively.
          </doc-notification>
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
              <tr><td><code>scheduleUpdate()</code></td><td>() =&gt; void</td><td>Manually trigger a re-render on the next animation frame</td></tr>
              <tr><td><code>shouldUpdate()</code></td><td>() =&gt; boolean</td><td>Return false to skip a render cycle. Default: true</td></tr>
              <tr><td><code>$(sel)</code></td><td>(sel: string) =&gt; Element</td><td>Shorthand for <code>this.shadow.querySelector(sel)</code></td></tr>
              <tr><td><code>$$(sel)</code></td><td>(sel: string) =&gt; Element[]</td><td>Shorthand for <code>Array.from(this.shadow.querySelectorAll(sel))</code></td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            See <loom-link to="/element/lifecycle" styles={[inlineLink]} style="color: var(--accent)">Lifecycle</loom-link> for <span class="ic">@mount</span>, <span class="ic">@unmount</span>, <span class="ic">firstUpdated()</span>.
            See <loom-link to="/element/css" styles={[inlineLink]} style="color: var(--accent)">CSS</loom-link> for <span class="ic">@styles</span> and <span class="ic">css``</span>.
            See <loom-link to="/element/decorators" styles={[inlineLink]} style="color: var(--accent)">Decorators</loom-link> for the full decorator cheat sheet.
          </doc-notification>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
