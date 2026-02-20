/**
 * JSX & Morphing — /element/jsx
 */
import { LoomElement } from "@toyz/loom";

export default class PageJsx extends LoomElement {
  update() {
    return (
      <div>
        <h1>JSX &amp; Morphing</h1>
        <p class="subtitle">Zero virtual DOM — JSX compiles directly to DOM nodes, and Loom morphs in-place.</p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Loom's JSX runtime (<span class="ic">@toyz/loom/jsx-runtime</span>) creates real DOM elements, not virtual nodes.
              When <span class="ic">update()</span> returns a new tree, Loom's morph algorithm diffs and patches the shadow DOM
              in-place, preserving focus, scroll position, and input values.
            </div>
            <code-block lang="json" code={`// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@toyz/loom"
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>Keyed Reconciliation</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use <span class="ic">loom-key</span> to enable efficient list diffing. Without keys, Loom re-uses
              nodes positionally. With keys, it correctly handles insertions, deletions, and reordering.
            </div>
            <code-block lang="ts" code={`update() {
  return (
    <ul>
      {this.items.map(item => (
        <li loom-key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>rawHTML</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Inject pre-rendered HTML strings with the <span class="ic">rawHTML</span> prop. Useful for markdown,
              syntax-highlighted code, or trusted server content.
            </div>
            <code-block lang="ts" code={`<div rawHTML={markdownToHtml(content)} />`}></code-block>
          </div>
          <div class="note">
            <strong>Warning:</strong> rawHTML bypasses Loom's DOM diffing. Only use with trusted content — never user input.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--amber)"></loom-icon>
            <h2>SVG Support</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              SVG elements are created with the correct namespace automatically. Loom recognizes all standard SVG tags
              (<span class="ic">svg</span>, <span class="ic">path</span>, <span class="ic">circle</span>,
              <span class="ic">g</span>, etc.).
            </div>
            <code-block lang="ts" code={`update() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24}>
      <circle cx={12} cy={12} r={10} fill="none" stroke="currentColor" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" />
    </svg>
  );
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--rose)"></loom-icon>
            <h2>loom-keep</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Mark elements with <span class="ic">loom-keep</span> to skip them during morphing.
              Useful for third-party libraries that manage their own DOM subtree (e.g., maps, charts, code editors).
            </div>
            <code-block lang="ts" code={`<div loom-keep ref={(el) => initMap(el)} />`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--accent)"></loom-icon>
            <h2>Event Handlers</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              JSX event handlers use the <span class="ic">onEvent</span> convention. They're added as native DOM event
              listeners and correctly diffed during morphing.
            </div>
            <code-block lang="ts" code={`<button onClick={() => this.save()}>Save</button>
<input onInput={(e) => this.query = e.target.value} />
<div onPointerDown={this.handleDrag} />`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
