/**
 * Example — Virtual List
 *
 * Live demo: <loom-virtual> rendering 10,000+ items
 */
import { LoomElement } from "@toyz/loom";
import "./components/virtual-list-demo";

export default class ExampleVirtualList extends LoomElement {
  update() {
    return (
      <div>
        <h1>Virtual List</h1>
        <p class="subtitle">
          Render 100k items without breaking a sweat.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20}></loom-icon>
            <h2>Demo</h2>
          </div>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Switch between sizes — the list only renders what's visible. Scroll to see dynamic measurement in action.
          </p>
          <virtual-list-demo></virtual-list-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20}></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">&lt;loom-virtual&gt;</span> — Windowed rendering for massive datasets</li>
            <li><span class="ic">Children template</span> — Render function as JSX children</li>
            <li><span class="ic">@reactive</span> — Declarative config via reactive state</li>
            <li><span class="ic">estimatedHeight</span> — Initial height estimate, auto-refined after paint</li>
            <li><span class="ic">Binary search</span> — O(log n) scroll position lookup</li>
            <li><span class="ic">Morph-aware props</span> — Changing <span class="ic">items</span> triggers automatic re-render</li>
            <li>Pure Loom — no imperative setup, just JSX</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/virtual-list-demo.tsx"></source-block>
        </section>
      </div>
    );
  }
}
