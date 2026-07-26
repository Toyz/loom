/**
 * JSX & Morphing — /element/jsx
 */
import { LoomElement } from "@toyz/loom";

export default class PageJsx extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="JSX &amp; Morphing" subtitle="Zero virtual DOM — JSX compiles directly to DOM nodes, and Loom morphs in-place."></doc-header>

        <section>
          <p>Loom's JSX has no virtual DOM. <span class="ic">jsx()</span> creates real elements immediately, so what <span class="ic">update()</span> returns is a live DOM tree, not a description of one. There is no diff of two object graphs, because there is only ever one graph.</p>
          <p>Re-rendering therefore has to reconcile new DOM against mounted DOM, and Loom does it in three tiers. If no dependency the render read has changed, it skips entirely. If the change only affects text or attributes bound to a closure, it patches those nodes directly and never rebuilds the tree. Only a structural change — different elements, a reordered list — falls through to a full morph.</p>
        </section>

        <section>
          <div class="group-header">
            <h2>How It Works</h2>
          </div>
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
          <div class="group-header">
            <h2>Keyed Reconciliation</h2>
          </div>
            <p>
              Use <span class="ic">loom-key</span> to enable efficient list diffing. Without keys, Loom re-uses
              nodes positionally. With keys, it correctly handles insertions, deletions, and reordering.
            </p>
            <code-block lang="ts" code={`update() {
  return (
    <ul>
      {this.items.map(item => (
        <li loom-key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <h2>rawHTML</h2>
          </div>
            <p>
              Inject pre-rendered HTML strings with the <span class="ic">rawHTML</span> prop. Useful for markdown,
              syntax-highlighted code, or trusted server content.
            </p>
            <code-block lang="ts" code={`<div rawHTML={markdownToHtml(content)} />`}></code-block>
          <doc-notification type="note">
            <strong>Warning:</strong> rawHTML bypasses Loom's DOM diffing. Only use with trusted content — never user input.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <h2>SVG Support</h2>
          </div>
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
          <div class="group-header">
            <h2>loom-keep</h2>
          </div>
            <p>
              Mark elements with <span class="ic">loom-keep</span> to skip them during morphing.
              Useful for third-party libraries that manage their own DOM subtree (e.g., maps, charts, code editors).
            </p>
            <code-block lang="ts" code={`<div loom-keep ref={(el) => initMap(el)} />`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <h2>Event Handlers</h2>
          </div>
            <p>
              JSX event handlers use the <span class="ic">onEvent</span> convention. They're added as native DOM event
              listeners and correctly diffed during morphing.
            </p>
            <code-block lang="ts" code={`<button onClick={() => this.save()}>Save</button>
<input onInput={(e) => this.query = e.target.value} />
<div onPointerDown={this.handleDrag} />`}></code-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
