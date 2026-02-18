/**
 * Stress Test — Multi-Component Demo
 *
 * N independent <stress-cell> components, each with their own
 * @reactive state and render counter. Only the "hot" cell's internal
 * @interval ticks. The rest stay idle — proving dependency tracking
 * skips components whose deps haven't changed.
 *
 * Decorators: @component, @styles, @reactive, @computed, @interval,
 *             @mount, @unmount, @watch
 */
import {
  LoomElement,
  component,
  reactive,
  prop,
  computed,
  css,
  styles,
  mount,
  unmount,
  watch,
} from "@toyz/loom";

// ── Cell component — fully independent ──

const cellSheet = css`
  :host { display: block; }
  .cell {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    user-select: none;
  }
  .cell:hover { background: var(--surface-3); }
  .cell.hot {
    border-color: var(--accent);
    box-shadow: 0 0 8px oklch(0.7 0.18 150 / 0.3);
  }
  .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text);
  }
  .tag {
    font-size: 0.6rem;
    color: var(--text-muted);
    margin-top: 2px;
  }
  .cell.hot .tag {
    color: var(--accent);
    font-weight: 700;
  }
  .renders {
    font-size: 0.55rem;
    margin-top: 1px;
    color: oklch(0.55 0.12 25);
  }
  .cell.hot .renders { color: oklch(0.7 0.18 150); }
`;

@component("stress-cell")
@styles(cellSheet)
class StressCell extends LoomElement {
  /** Internal tick counter — only increments when this cell is hot */
  @reactive accessor ticks = 0;

  /** Whether this cell is hot (ticking) — 1/0 to avoid boolean removeAttribute gap */
  @prop accessor hot = 0;

  /** Display index — set by parent via @prop */
  @prop accessor index = 0;

  /** Render counter */
  private _renders = 0;
  private _timer: number | null = null;

  @watch("hot")
  onHotChange(val: number) {
    this._syncTimer(!!val);
  }

  /** Check initial hot state — @watch may miss the first attributeChangedCallback */
  @mount
  onMount() {
    if (this.hot) this._syncTimer(true);
  }

  @unmount
  cleanup() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

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
      <div class={`cell${this.hot ? " hot" : ""}`}>
        <div class="value">{() => this.hot ? this.ticks : "—"}</div>
        <div class="tag">{this.hot ? <span><loom-icon name="bolt" size={10} color="var(--accent)"></loom-icon> HOT</span> : `#${this.index}`}</div>
        <div class="renders">renders: {this._renders}</div>
      </div>
    );
  }
}

// ── Parent orchestrator ──

const parentSheet = css`
  :host { display: block; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 6px;
    margin: 1.5rem 0;
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  .controls button {
    padding: 0.4rem 1rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.15s;
  }
  .controls button:hover { background: var(--surface-3); }
  .controls button.accent {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
    font-weight: 600;
  }
  .info {
    padding: 1rem;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    margin-top: 1rem;
    font-variant-numeric: tabular-nums;
  }
  .info .row {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;
    font-size: 0.85rem;
  }
  .info .label { color: var(--text-muted); }
  .info .val { font-weight: 600; color: var(--accent); }
  .decorators {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: oklch(0.2 0.02 150 / 0.5);
    border: 1px solid oklch(0.4 0.08 150 / 0.3);
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .decorators code { color: var(--accent); font-weight: 600; }
`;

@component("stress-test")
@styles(parentSheet)
class StressTest extends LoomElement {
  @reactive accessor cellCount = 50;
  @reactive accessor hotCell = 0;

  setCellCount(n: number) {
    console.log("setCellCount", n);
    this.cellCount = n;
    this.hotCell = 0;
  }

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
        <div class="controls">
          <button class={this.cellCount === 50 ? "accent" : ""} onClick={() => this.setCellCount(50)}>50 cells</button>
          <button class={this.cellCount === 100 ? "accent" : ""} onClick={() => this.setCellCount(100)}>100 cells</button>
          <button class={this.cellCount === 200 ? "accent" : ""} onClick={() => this.setCellCount(200)}>200 cells</button>
        </div>

        <div class="grid">{cells}</div>

        <div class="info">
          <div class="row">
            <span class="label">Components on page</span>
            <span class="val">{this.cellCount} cells + 1 parent</span>
          </div>
          <div class="row">
            <span class="label">Hot cell</span>
            <span class="val">#{this.hotCell}</span>
          </div>
          <div class="row">
            <span class="label">What to observe</span>
            <span class="val">cell: renders climb. Others: renders = 2</span>
          </div>
        </div>

        <div class="decorators">
          Each <code>&lt;stress-cell&gt;</code> is its own <code>LoomElement</code> with an internal <code>@reactive ticks</code>.
          Only the hot cell's <code>@watch("hot")</code> starts a <code>setInterval</code> that increments <code>ticks</code>.
          The other {this.cellCount - 1} cells' dependencies never change → <code>scheduleUpdate()</code> skips them via <code>hasDirtyDeps()</code>.
        </div>
      </div>
    );
  }
}
