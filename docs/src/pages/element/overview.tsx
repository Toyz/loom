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
        <doc-header title="LoomElement" subtitle="One method to override, and a decorator for everything else. No virtual DOM in between."></doc-header>

        <section>
          <p>A raw web component makes you write the plumbing yourself: <span class="ic">observedAttributes</span>, an <span class="ic">attributeChangedCallback</span> that parses strings by hand, a render call you remember to make, and a matching teardown for every listener and timer you started. Most of that code is identical in every component, and the parts that differ are the parts people get wrong.</p>
          <p><span class="ic">LoomElement</span> reduces it to one method. You write <span class="ic">update()</span> returning DOM; everything else is declared with a decorator and torn down for you when the element disconnects. There is no virtual DOM in between — <span class="ic">update()</span> builds real nodes, and a re-render morphs the existing tree in place rather than replacing it.</p>
        </section>

        <section>
          <div class="group-header">
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
