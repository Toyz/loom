/**
 * Element — Decorators  /element/decorators
 *
 * @component, @reactive, @prop, @computed, @mount, @unmount,
 * @query, @queryAll, @catch_, @suspend, @slot, @transition reference page.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementDecorators extends LoomElement {
  update() {
    return (
      <div>
        <h1>Decorators</h1>
        <p class="subtitle">Element-specific decorators for registration, state, lifecycle, and DOM queries.</p>

        <section>
          <h2>@component</h2>
          <p>
            Registers a class as a custom element. This is the entry point for every
            Loom component.
          </p>
          <code-block lang="ts" code={`import { component, LoomElement } from "@toyz/loom";

@component("my-counter")
class MyCounter extends LoomElement {
  update() {
    return <p>Hello from MyCounter</p>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>@reactive</h2>
          <p>
            Internal reactive state. Changes schedule batched <span class="ic">update()</span> via
            microtask. Backed by <span class="ic">Reactive&lt;T&gt;</span>.
          </p>
          <code-block lang="ts" code={`@reactive accessor count = 0;
@reactive accessor userName = "";
@reactive accessor items: string[] = [];`}></code-block>
        </section>

        <section>
          <h2>@prop</h2>
          <p>
            External property. Auto-parses HTML attributes (number, boolean, string)
            and accepts any type via JSX. Uses <span class="ic">@reactive</span> under the hood.
          </p>
          <code-block lang="ts" code={`@prop accessor label = "Count";   // <my-counter label="Clicks">
@prop accessor initial = 0;       // parsed as number
@prop accessor disabled = false;  // parsed as boolean`}></code-block>
        </section>

        <section>
          <h2>@computed</h2>
          <p>
            Cached derived value on a getter. Re-computed only when <span class="ic">@reactive</span> dependencies
            trigger a re-render.
          </p>
          <code-block lang="ts" code={`@computed
get displayName() {
  return \`\${this.firstName} \${this.lastName}\`;
}`}></code-block>
        </section>

        <section>
          <h2>Lifecycle</h2>

          <h3>@mount</h3>
          <p>Runs once when the element is connected to the DOM.</p>
          <code-block lang="ts" code={`@mount
setup() {
  console.log("Connected!");
}`}></code-block>

          <h3>@unmount</h3>
          <p>Runs once when the element is disconnected from the DOM.</p>
          <code-block lang="ts" code={`@unmount
cleanup() {
  console.log("Disconnected!");
}`}></code-block>

          <h3>@catch_</h3>
          <p>Error boundary — catches errors thrown during <span class="ic">update()</span>.</p>

          <h3>@suspend</h3>
          <p>Suspense boundary — shows fallback while async work resolves.</p>
        </section>

        <section>
          <h2>DOM Queries</h2>
          <code-block lang="ts" code={`// Single element
@query(".my-input") input!: HTMLInputElement;

// Multiple elements
@queryAll("li") items!: NodeListOf<HTMLLIElement>;`}></code-block>
        </section>

        <section>
          <h2>@styles</h2>
          <p>
            Auto-adopt <span class="ic">CSSStyleSheet</span>s when the element connects.
            Use with the <span class="ic">css</span> tagged template. Multiple calls stack.
          </p>
          <code-block lang="ts" code={`import { component, styles, css, LoomElement } from "@toyz/loom";

const sheet = css\`
  :host { display: block; }
  .title { font-weight: 700; color: var(--accent); }
\`;

@component("my-widget")
@styles(sheet)
class MyWidget extends LoomElement {
  update() {
    return <h2 class="title">Styled!</h2>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>@slot</h2>
          <p>
            Typed access to slot-assigned elements. Updates automatically on
            <span class="ic">slotchange</span> and triggers re-render.
          </p>
          <code-block lang="ts" code={`// Default slot
@slot()
content!: Element[];

// Named slot with type
@slot<CardHeader>("header")
headers!: CardHeader[];

// Heterogeneous slot content
@slot<CardHeader, CardBody, CardFooter>("content")
sections!: (CardHeader | CardBody | CardFooter)[];`}></code-block>
        </section>

        <section>
          <h2>@transition</h2>
          <p>
            Enter/leave CSS animations for conditional DOM. Wraps a render method to
            apply animations when content appears or disappears.
          </p>
          <code-block lang="ts" code={`@transition({ enter: "fade-in 300ms", leave: "fade-out 200ms" })
renderPanel() {
  if (!this.showPanel) return null;
  return <div class="panel">...</div>;
}

// Also supports CSS classes instead of animation shorthands:
@transition({ enterClass: "slide-in", leaveClass: "slide-out" })
renderDrawer() {
  if (!this.open) return null;
  return <aside class="drawer">...</aside>;
}`}></code-block>
        </section>

        <section>
          <h2>API Reference</h2>
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@component(tag)</code></td><td>Class</td><td>Register custom element</td></tr>
              <tr><td><code>@styles(sheet, ...)</code></td><td>Class</td><td>Auto-adopt CSSStyleSheets on connect</td></tr>
              <tr><td><code>@reactive</code></td><td>Field</td><td>Reactive state, triggers <code>update()</code></td></tr>
              <tr><td><code>@prop</code></td><td>Field</td><td>External attribute/property, auto-parsed</td></tr>
              <tr><td><code>@computed</code></td><td>Getter</td><td>Cached derived value</td></tr>
              <tr><td><code>@mount</code></td><td>Method</td><td>Run on connect</td></tr>
              <tr><td><code>@unmount</code></td><td>Method</td><td>Run on disconnect</td></tr>
              <tr><td><code>@catch_</code></td><td>Method</td><td>Error boundary handler</td></tr>
              <tr><td><code>@suspend</code></td><td>Method</td><td>Suspense fallback</td></tr>
              <tr><td><code>@query(sel)</code></td><td>Field</td><td>Shadow DOM querySelector</td></tr>
              <tr><td><code>@queryAll(sel)</code></td><td>Field</td><td>Shadow DOM querySelectorAll</td></tr>
              <tr><td><code>@slot(name?)</code></td><td>Field</td><td>Typed slot-assigned elements, auto-updates on slotchange</td></tr>
              <tr><td><code>@transition(opts)</code></td><td>Method</td><td>Enter/leave CSS animations for conditional DOM</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
