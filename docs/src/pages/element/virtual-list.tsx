/**
 * Virtual List — /element/virtual-list
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/element/virtual-list")
@component("page-virtual-list")
export class PageVirtualList extends LoomElement {
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
          <code-block lang="ts" code={`import { LoomVirtual } from "@toyz/loom/element/virtual";`}></code-block>
        </section>

        <section>
          <h2>Basic Usage</h2>
          <code-block lang="ts" code={`import { LoomVirtual } from "@toyz/loom/element/virtual";

const list = document.createElement("loom-virtual") as LoomVirtual<Item>;

list.setItems(items);
list.renderItem = (item) => {
  const row = document.createElement("div");
  row.textContent = item.name;
  return row;
};

this.shadow.appendChild(list);`}></code-block>
        </section>

        <section>
          <h2>API</h2>
          <table class="api-table">
            <thead><tr><th>Method / Property</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>setItems(items)</code></td><td>Set the full item array. Triggers re-render.</td></tr>
              <tr><td><code>push(...items)</code></td><td>Append items without re-rendering existing rows.</td></tr>
              <tr><td><code>renderItem</code></td><td>Function that creates a DOM element for an item.</td></tr>
              <tr><td><code>estimatedHeight</code></td><td>Initial height estimate per row (default: 40px). Refined after measurement.</td></tr>
              <tr><td><code>adoptStyles(sheet)</code></td><td>Adopt a CSSStyleSheet into the virtual list's shadow root.</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Infinite Scroll</h2>
          <p>Combine <span class="ic">push()</span> with a scroll listener for infinite loading:</p>
          <code-block lang="ts" code={`list.addEventListener("scroll", async () => {
  const { scrollTop, scrollHeight, clientHeight } = list;
  if (scrollHeight - scrollTop - clientHeight < 200) {
    const next = await fetchPage(page++);
    list.push(...next);
  }
});`}></code-block>
        </section>

        <section>
          <h2>Styling Items</h2>
          <p>Use <span class="ic">adoptStyles()</span> to pass styles into the virtual list's Shadow DOM:</p>
          <code-block lang="ts" code={`import { css } from "@toyz/loom";

const itemStyles = css\`
  .row { padding: 12px 16px; border-bottom: 1px solid #222; }
  .row:hover { background: #1a1a2e; }
\`;

list.adoptStyles(itemStyles);`}></code-block>
        </section>
      </div>
    );
  }
}
