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
        <doc-header title="Virtual List" subtitle="Render 100k items without breaking a sweat."></doc-header>

        <section>
          <p>A hundred thousand rows with a few dozen elements in the DOM. Open the inspector while scrolling and count them: the list is windowed, so the cost is the viewport rather than the dataset. Row heights are measured rather than assumed, so they do not have to match.</p>
        </section>

        <section>
          <div class="group-header">
            <h2>Demo</h2>
          </div>
          <p class="hint">
            Switch between sizes — the list only renders what's visible. Scroll to see dynamic measurement in action.
          </p>
          <virtual-list-demo></virtual-list-demo>
        </section>

        <section>
          <div class="group-header">
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
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/virtual-list-demo.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
