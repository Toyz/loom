/**
 * JSX & Morphing — /core/jsx
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/core/jsx")
@component("page-jsx")
export class PageJsx extends LoomElement {
  update() {
    this.css`
      .warn { background: rgba(251,191,36,.08); border: 1px solid rgba(251,191,36,.25); border-radius: var(--radius-md); padding: var(--space-4) var(--space-5); font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-4); }
      .warn strong { color: var(--amber); }
    `;

    return (
      <div>
        <h1>JSX &amp; Morphing</h1>
        <p class="subtitle">Zero virtual DOM — JSX compiles directly to DOM nodes, and Loom morphs in-place.</p>

        <section>
          <h2>How It Works</h2>
          <p>
            Loom's JSX runtime (<span class="ic">@toyz/loom/jsx-runtime</span>) creates real DOM elements, not virtual nodes.
            When <span class="ic">update()</span> returns a new tree, Loom's morph algorithm diffs and patches the shadow DOM
            in-place, preserving focus, scroll position, and input values.
          </p>
          <code-block lang="json" code={`// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@toyz/loom"
  }
}`}></code-block>
        </section>

        <section>
          <h2>Keyed Reconciliation</h2>
          <p>
            Use <span class="ic">data-loom-key</span> to enable efficient list diffing. Without keys, Loom re-uses
            nodes positionally. With keys, it correctly handles insertions, deletions, and reordering.
          </p>
          <code-block lang="ts" code={`update() {
  return (
    <ul>
      {this.items.map(item => (
        <li data-loom-key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}`}></code-block>
        </section>

        <section>
          <h2>rawHTML</h2>
          <p>
            Inject pre-rendered HTML strings with the <span class="ic">rawHTML</span> prop. Useful for markdown,
            syntax-highlighted code, or trusted server content.
          </p>
          <code-block lang="ts" code={`<div rawHTML={markdownToHtml(content)} />`}></code-block>
          <div class="warn">
            <strong>Warning:</strong> rawHTML bypasses Loom's DOM diffing. Only use with trusted content — never user input.
          </div>
        </section>

        <section>
          <h2>SVG Support</h2>
          <p>
            SVG elements are created with the correct namespace automatically. Loom recognizes all standard SVG tags
            (<span class="ic">svg</span>, <span class="ic">path</span>, <span class="ic">circle</span>,
            <span class="ic">g</span>, etc.).
          </p>
          <code-block lang="ts" code={`update() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24}>
      <circle cx={12} cy={12} r={10} fill="none" stroke="currentColor" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" />
    </svg>
  );
}`}></code-block>
        </section>

        <section>
          <h2>loom-keep</h2>
          <p>
            Mark elements with <span class="ic">loom-keep</span> to skip them during morphing.
            Useful for third-party libraries that manage their own DOM subtree (e.g., maps, charts, code editors).
          </p>
          <code-block lang="ts" code={`<div loom-keep ref={(el) => initMap(el)} />`}></code-block>
        </section>

        <section>
          <h2>Event Handlers</h2>
          <p>
            JSX event handlers use the <span class="ic">onEvent</span> convention. They're added as native DOM event
            listeners and correctly diffed during morphing.
          </p>
          <code-block lang="ts" code={`<button onClick={() => this.save()}>Save</button>
<input onInput={(e) => this.query = e.target.value} />
<div onPointerDown={this.handleDrag} />`}></code-block>
        </section>
      </div>
    );
  }
}
