/**
 * Example — Stress Test
 *
 * Live demo: Traced Template Projection, @interval, @computed, @watch, @mount/@unmount
 */
import { LoomElement } from "@toyz/loom";
import "./components/stress-test";

export default class ExampleStressTest extends LoomElement {
  update() {
    return (
      <div>
        <h1>Stress Test</h1>
        <p class="subtitle">
          Traced Template Projection in action — a <span class="ic">@interval(16)</span> ticks
          at 60fps while <span class="ic">@computed</span> derives stats and{" "}
          <span class="ic">@watch</span> reacts to changes.
        </p>

        <section>
          <h2>Demo</h2>
          <p>
            Click any cell to make it the <strong>hot cell</strong>. Only the
            hot cell's value ticks at 60fps via <span class="ic">@interval</span>. Watch
            the render counter to see how the framework handles rapid state changes.
          </p>
          <stress-test></stress-test>
        </section>

        <section>
          <h2>Loom Decorators Used</h2>
          <ul>
            <li><span class="ic">@component("stress-test")</span> — registers the custom element</li>
            <li><span class="ic">@styles(sheet)</span> — scoped CSS via adopted stylesheet</li>
            <li><span class="ic">@reactive</span> — observable state: cells, hotCell, ticks, renderCount</li>
            <li><span class="ic">@computed</span> — derived values: hotValue, skippedRenders, skipRate (cached until deps dirty)</li>
            <li><span class="ic">@interval(16)</span> — auto-cleaned 60fps tick, zero manual setInterval</li>
            <li><span class="ic">@mount</span> / <span class="ic">@unmount</span> — lifecycle hooks</li>
            <li><span class="ic">@watch("hotCell")</span> — resets old cell when hot index changes</li>
          </ul>
        </section>

        <section>
          <h2>Traced Template Projection</h2>
          <ol>
            <li><span class="ic">startTrace()</span> wraps <span class="ic">update()</span> and records every <span class="ic">Reactive.value</span> read</li>
            <li>The dependency set is stored as <span class="ic">__traceDeps</span></li>
            <li>On subsequent <span class="ic">scheduleUpdate()</span> calls, <span class="ic">hasDirtyDeps()</span> checks if any dependency changed</li>
            <li>If clean → skip the entire render pipeline. No update(), no JSX, no morph</li>
          </ol>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, reactive, computed, css, styles, interval, mount, unmount, watch } from "@toyz/loom";

const sheet = css\`
  .stress-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 6px;
  }
  .cell { background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; }
  .cell.hot { border-color: var(--accent); box-shadow: 0 0 8px oklch(0.7 0.18 150 / 0.3); }
\`;

@component("stress-test")
@styles(sheet)
class StressTest extends LoomElement {
  @reactive accessor cells: number[] = Array.from({ length: 100 }, () => 0);
  @reactive accessor hotCell = 0;
  @reactive accessor ticks = 0;
  @reactive accessor renderCount = 0;

  // Derived — cached until deps dirty
  @computed get hotValue() { return this.cells[this.hotCell] ?? 0; }
  @computed get skipRate() {
    if (this.ticks === 0) return "—";
    const skipped = Math.max(0, this.ticks - this.renderCount);
    return ((skipped / this.ticks) * 100).toFixed(1) + "%";
  }

  // 60fps tick — auto-cleaned by Loom
  @interval(16)
  tick() {
    this.ticks++;
    const next = [...this.cells];
    next[this.hotCell] = this.ticks;
    this.cells = next;
  }

  // React to hot cell changing
  @watch("hotCell")
  onHotCellChange(newIdx: number, oldIdx: number) {
    const next = [...this.cells];
    next[oldIdx] = 0;
    this.cells = next;
  }

  @mount onMount() { /* state set via @reactive defaults */ }
  @unmount onUnmount() { /* @interval auto-cleaned */ }

  update() {
    this.renderCount++;
    return (
      <div>
        <div class="stress-grid">
          {this.cells.map((val, i) => (
            <div class={\`cell\${i === this.hotCell ? " hot" : ""}\`}
                 onClick={() => { this.hotCell = i; }}>
              <div class="value">{val}</div>
              <div class="tag">{i === this.hotCell ? "HOT" : \`#\${i}\`}</div>
            </div>
          ))}
        </div>
        <p>Ticks: {this.ticks} | Renders: {this.renderCount} | Hot: {this.hotValue}</p>
      </div>
    );
  }
}`;
