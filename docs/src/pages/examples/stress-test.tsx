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

const SOURCE = `import {
  LoomElement, component, reactive, prop, computed,
  css, styles, mount, unmount, watch,
} from "@toyz/loom";

// ── Cell component — fully independent ──

const cellSheet = css\`
  :host { display: block; }
  .cell {
    background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 8px; padding: 8px; text-align: center; cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cell.hot {
    border-color: var(--accent);
    box-shadow: 0 0 8px oklch(0.7 0.18 150 / 0.3);
  }
  .value { font-size: 1.1rem; font-weight: 600; }
  .tag { font-size: 0.6rem; color: var(--text-muted); margin-top: 2px; }
  .renders { font-size: 0.55rem; margin-top: 1px; color: oklch(0.55 0.12 25); }
\`;

@component("stress-cell")
@styles(cellSheet)
class StressCell extends LoomElement {
  @reactive accessor ticks = 0;
  @prop accessor hot = 0;
  @prop accessor index = 0;

  private _renders = 0;
  private _timer: number | null = null;

  @watch("hot")
  onHotChange(val: number) {
    this._syncTimer(!!val);
  }

  @mount onMount() { if (this.hot) this._syncTimer(true); }
  @unmount cleanup() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }

  private _syncTimer(active: boolean) {
    if (active && !this._timer) {
      this._timer = window.setInterval(() => { this.ticks++; }, 16);
    } else if (!active && this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this.ticks = 0;
    }
  }

  update() {
    this._renders++;
    return (
      <div class={"cell" + (this.hot ? " hot" : "")}>
        <div class="value">{this.hot ? this.ticks : "—"}</div>
        <div class="tag">{this.hot ? "⚡ HOT" : "#" + this.index}</div>
        <div class="renders">renders: {this._renders}</div>
      </div>
    );
  }
}

// ── Parent orchestrator ──

@component("stress-test")
class StressTest extends LoomElement {
  @reactive accessor cellCount = 50;
  @reactive accessor hotCell = 0;

  update() {
    const cells = [];
    for (let i = 0; i < this.cellCount; i++) {
      cells.push(
        <stress-cell
          index={i}
          hot={i === this.hotCell ? 1 : 0}
          onClick={() => { this.hotCell = i; }}
        ></stress-cell>
      );
    }
    return (
      <div>
        <div class="grid">{cells}</div>
        <p>Cells: {this.cellCount} | Hot: #{this.hotCell}</p>
      </div>
    );
  }
}`;
