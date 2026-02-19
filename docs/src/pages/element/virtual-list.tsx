/**
 * Virtual List — /element/virtual-list
 */
import { LoomElement } from "@toyz/loom";

export default class PageVirtualList extends LoomElement {
  update() {
    return (
      <div>
        <h1>Virtual List</h1>
        <p class="subtitle">Render thousands of items efficiently with windowed virtualization.</p>

        <section>
          <h2>Overview</h2>
          <p>
            <span class="ic">&lt;loom-virtual&gt;</span> renders only the visible items in a scrollable container.
            Items are measured, cached, and recycled — you get smooth scrolling even with 100k+ rows.
          </p>
          <p>
            <span class="ic">LoomVirtual</span> is a built-in element that ships with Loom. Import it explicitly
            to register the custom element (it's excluded from the main barrel to avoid side effects):
          </p>
          <code-block lang="ts" code={`import "@toyz/loom/element/virtual";`}></code-block>
        </section>

        <section>
          <h2>Basic Usage</h2>
          <p>
            Pass your data via <span class="ic">items</span> and provide a render template as a function child:
          </p>
          <code-block lang="tsx" code={`import "@toyz/loom/element/virtual";

// In your component's update():
<loom-virtual items={this.messages} estimatedHeight={44}>
  {(msg: Message) => (
    <div class="msg">{msg.text}</div>
  )}
</loom-virtual>`}></code-block>
        </section>

        <section>
          <h2>Styling</h2>
          <p>
            <span class="ic">&lt;loom-virtual&gt;</span> uses Shadow DOM internally. The host element must have
            <span class="ic">display: block</span> and a <strong>fixed height</strong> — without a constrained
            height, there's nothing to virtualize against.
          </p>
          <code-block lang="css" code={`/* In the consumer's styles */
loom-virtual {
  display: block;
  height: 400px;        /* or any fixed/max height */
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;     /* clip host — inner viewport scrolls */
}`}></code-block>
          <p>
            The internal structure is <span class="ic">.vl-viewport → .vl-spacer → .vl-window</span>.
            The viewport scrolls, the spacer sets the total height, and the window is absolutely positioned
            to render only visible items.
          </p>
        </section>

        <section>
          <h2>Props</h2>
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>items</code></td><td><code>T[]</code></td><td><code>[]</code></td><td>Array of items to virtualize. Assigning a new array triggers re-render.</td></tr>
              <tr><td><code>estimatedHeight</code></td><td><code>number</code></td><td><code>40</code></td><td>Initial height estimate per row in px. Auto-refined after measurement.</td></tr>
              <tr><td><code>overscan</code></td><td><code>number</code></td><td><code>3</code></td><td>Extra items rendered above/below the visible window.</td></tr>
              <tr><td><code>pinToBottom</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Auto-scroll to bottom when items are appended. Great for chat UIs.</td></tr>
              <tr><td><code>onNearEnd</code></td><td><code>() =&gt; void</code></td><td><code>null</code></td><td>Callback fired when scrolled within 100px of the bottom — use for infinite scroll / pagination.</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Imperative Methods</h3>
          <table class="api-table">
            <thead><tr><th>Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>push(...items)</code></td><td>Append items. Auto-scrolls if user is near the bottom.</td></tr>
              <tr><td><code>scrollToEnd()</code></td><td>Scroll to the very bottom immediately.</td></tr>
              <tr><td><code>refresh()</code></td><td>Re-measure all visible items and rebuild offsets.</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Children Template</h2>
          <p>
            The function child is the render template. It receives each item and its index,
            and returns a DOM node. JSX works perfectly — you can even use other Loom components:
          </p>
          <code-block lang="tsx" code={`<loom-virtual items={this.people} estimatedHeight={38}>
  {(person: Person, index: number) => (
    <person-row pid={person.id} name={person.name} role={person.role}>
    </person-row>
  )}
</loom-virtual>`}></code-block>
        </section>

        <section>
          <h2>Infinite Scroll</h2>
          <p>Use the <span class="ic">onNearEnd</span> callback for pagination:</p>
          <code-block lang="tsx" code={`<loom-virtual
  items={this.messages}
  estimatedHeight={44}
  onNearEnd={() => this.loadMore()}
>
  {(msg: Message) => <div class="msg">{msg.text}</div>}
</loom-virtual>`}></code-block>
        </section>

        <section>
          <h2>Dynamic Item Counts</h2>
          <p>
            Changing the <span class="ic">items</span> array (by reference) automatically clears
            the height cache, rebuilds offsets, and re-renders the visible window. This works seamlessly
            with reactive state:
          </p>
          <code-block lang="tsx" code={`@reactive accessor data: Person[] = generate(10_000);

setCount(n: number) {
  this.data = generate(n); // new array → triggers invalidation
}

// In update():
<loom-virtual items={this.data} estimatedHeight={38}>
  {(p: Person) => <div>{p.name}</div>}
</loom-virtual>`}></code-block>
        </section>
      </div>
    );
  }
}
