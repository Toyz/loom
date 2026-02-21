/**
 * Timing Showcase — interactive demos for all 5 timing decorators.
 *
 * Cards: Stopwatch (@interval), Toast (@timeout), Search (@debounce),
 *        Mouse Track (@throttle), Bounce (@animationFrame)
 */
import {
  LoomElement,
  component,
  reactive,
  css,
  styles,
  interval,
  timeout,
  debounce,
  throttle,
  animationFrame,
  query,
} from "@toyz/loom";

/* ─── Styles ─── */
const sheet = css`
  :host { display: block; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.25rem;
  }
  .card {
    background: var(--surface-2, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--accent, #a78bfa);
  }
  .card .desc {
    font-size: 0.82rem;
    color: var(--text-muted, #888);
    line-height: 1.4;
  }
  .card .demo {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 100px;
  }

  /* shared button */
  button {
    padding: 0.45rem 1rem;
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    background: var(--surface-2, #1e1e2e);
    color: var(--text, #ccc);
    cursor: pointer;
    font-size: 0.82rem;
    transition: border-color 0.15s;
  }
  button:hover { border-color: var(--accent, #a78bfa); }

  /* stopwatch */
  .big-num {
    font-size: 2.5rem;
    font-weight: 200;
    font-variant-numeric: tabular-nums;
    color: var(--accent, #a78bfa);
  }

  /* toast */
  .toast {
    padding: 0.6rem 1rem;
    border-radius: 8px;
    background: var(--accent-glow, #2a1f4e);
    color: var(--accent, #a78bfa);
    border: 1px solid var(--accent-dim, #444);
    font-size: 0.82rem;
    animation: fade-in 0.2s ease;
  }
  @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } }

  /* debounce */
  input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    background: var(--surface, #121212);
    color: var(--text, #ccc);
    font-size: 0.85rem;
    width: 100%;
    box-sizing: border-box;
  }
  input:focus { outline: none; border-color: var(--accent, #a78bfa); }
  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--text-muted, #888);
    width: 100%;
  }

  /* throttle */
  .track-area {
    width: 100%;
    height: 100px;
    border: 1px dashed var(--border, #333);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    color: var(--text-muted, #888);
    cursor: crosshair;
    position: relative;
    overflow: hidden;
    user-select: none;
  }
  .dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    background: var(--accent, #a78bfa);
    position: absolute;
    pointer-events: none;
    transition: left 0.05s, top 0.05s;
  }

  /* animation frame / ball bounce */
  .canvas-wrap {
    width: 100%;
    height: 120px;
    position: relative;
    border: 1px dashed var(--border, #333);
    border-radius: 8px;
    overflow: hidden;
  }
  .ball {
    width: 24px; height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #a78bfa, #c084fc);
    position: absolute;
    will-change: transform;
    box-shadow: 0 0 12px rgba(167, 139, 250, 0.4);
  }
  .fps {
    position: absolute;
    top: 6px; right: 8px;
    font-size: 0.7rem;
    font-family: monospace;
    color: var(--text-muted, #888);
  }
`;

@component("timing-showcase")
@styles(sheet)
export class TimingShowcase extends LoomElement {

  /* ── 1. Stopwatch (@interval) ── */
  @reactive accessor elapsed = 0;
  @reactive accessor running = false;
  private _intervalId: number | null = null;

  toggleStopwatch() {
    this.running = !this.running;
    if (this.running) {
      this._intervalId = window.setInterval(() => {
        this.elapsed++;
      }, 100) as unknown as number;
    } else if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  resetStopwatch() {
    this.elapsed = 0;
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this.running = false;
  }

  /* ── 2. Toast (@timeout) ── */
  @reactive accessor toastVisible = false;
  private _toastTimer: number | null = null;

  showToast() {
    if (this._toastTimer !== null) clearTimeout(this._toastTimer);
    this.toastVisible = true;
    this._toastTimer = window.setTimeout(() => {
      this.toastVisible = false;
      this._toastTimer = null;
    }, 3000) as unknown as number;
  }

  /* ── 3. Debounce search (@debounce) ── */
  @reactive accessor rawKeystrokes = 0;
  @reactive accessor debouncedCount = 0;
  @reactive accessor debouncedValue = "";
  @reactive accessor searchInput = "";

  onSearchInput(e: Event) {
    this.rawKeystrokes++;
    this.searchInput = (e.target as HTMLInputElement).value;
    this.debouncedSearch(this.searchInput);
  }

  @debounce(300)
  debouncedSearch(q: string) {
    this.debouncedCount++;
    this.debouncedValue = q;
  }

  /* ── 4. Throttle mouse (@throttle) ── */
  @reactive accessor rawMoves = 0;
  @reactive accessor throttledMoves = 0;
  @reactive accessor dotX = 50;
  @reactive accessor dotY = 50;

  onMouseMoveRaw(e: MouseEvent) {
    this.rawMoves++;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this.throttledMove(x, y);
  }

  @throttle(60)
  throttledMove(x: number, y: number) {
    this.throttledMoves++;
    this.dotX = x;
    this.dotY = y;
  }

  /* ── 5. Ball bounce (@animationFrame) ── */
  @reactive accessor ballX = 20;
  @reactive accessor ballY = 30;
  @reactive accessor fps = 0;
  @reactive accessor animPaused = false;
  private vx = 120;   // px/s
  private vy = 80;
  private frameCount = 0;
  private fpsAccum = 0;

  @animationFrame(0)
  bounce(dt: number) {
    if (this.animPaused) return;

    // FPS counter
    this.fpsAccum += dt;
    this.frameCount++;
    if (this.fpsAccum >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsAccum = 0;
    }

    // physics
    const wrap = this.shadowRoot?.querySelector(".canvas-wrap") as HTMLElement | null;
    if (!wrap) return;
    const W = wrap.clientWidth - 24;
    const H = wrap.clientHeight - 24;

    this.ballX += this.vx * dt;
    this.ballY += this.vy * dt;

    if (this.ballX <= 0)  { this.ballX = 0;  this.vx = Math.abs(this.vx); }
    if (this.ballX >= W)  { this.ballX = W;  this.vx = -Math.abs(this.vx); }
    if (this.ballY <= 0)  { this.ballY = 0;  this.vy = Math.abs(this.vy); }
    if (this.ballY >= H)  { this.ballY = H;  this.vy = -Math.abs(this.vy); }
  }

  /* ── Cleanup ── */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._intervalId !== null) clearInterval(this._intervalId);
    if (this._toastTimer !== null) clearTimeout(this._toastTimer);
  }

  /* ── Render ── */
  update() {
    const secs = (this.elapsed / 10).toFixed(1);

    return (
      <div class="grid">

        {/* 1 — Stopwatch */}
        <div class="card">
          <h3>@interval</h3>
          <p class="desc">Auto-cleaned repeating timer. Ticks every 100ms while running.</p>
          <div class="demo">
            <span class="big-num">{secs}s</span>
            <div style="display:flex;gap:0.5rem;">
              <button onClick={() => this.toggleStopwatch()}>
                {this.running ? "⏸ Pause" : "▶ Start"}
              </button>
              <button onClick={() => this.resetStopwatch()}>↺ Reset</button>
            </div>
          </div>
        </div>

        {/* 2 — Toast */}
        <div class="card">
          <h3>@timeout</h3>
          <p class="desc">One-shot timer. Toast auto-dismisses after 3 seconds.</p>
          <div class="demo">
            <button onClick={() => this.showToast()}>Show Toast</button>
            {this.toastVisible
              ? <div class="toast">This toast vanishes in 3s!</div>
              : <span style="font-size:0.8rem;color:var(--text-muted)">No toast visible</span>
            }
          </div>
        </div>

        {/* 3 — Debounce */}
        <div class="card">
          <h3>@debounce</h3>
          <p class="desc">Delays execution until 300ms of inactivity. Compare raw vs debounced.</p>
          <div class="demo">
            <input placeholder="Type something…" value={this.searchInput} onInput={(e: Event) => this.onSearchInput(e)} />
            <div class="stat-row">
              <span>Raw keystrokes: <strong>{this.rawKeystrokes}</strong></span>
              <span>Debounced calls: <strong>{this.debouncedCount}</strong></span>
            </div>
            {this.debouncedValue &&
              <div style="font-size:0.8rem;color:var(--accent);">
                Value: "{this.debouncedValue}"
              </div>
            }
          </div>
        </div>

        {/* 4 — Throttle */}
        <div class="card">
          <h3>@throttle</h3>
          <p class="desc">Rate-limits to at most once per 60ms. Move your mouse inside the box.</p>
          <div class="demo">
            <div class="track-area" onMouseMove={(e: MouseEvent) => this.onMouseMoveRaw(e)}>
              <div class="dot" style={`left:${this.dotX}%;top:${this.dotY}%;transform:translate(-50%,-50%);`}></div>
              {this.rawMoves === 0 && <span>Hover here</span>}
            </div>
            <div class="stat-row">
              <span>Raw events: <strong>{this.rawMoves}</strong></span>
              <span>Throttled: <strong>{this.throttledMoves}</strong></span>
            </div>
          </div>
        </div>

        {/* 5 — Animation Frame */}
        <div class="card">
          <h3>@animationFrame</h3>
          <p class="desc">Centralized rAF loop with layer ordering. Bouncing ball at 60fps.</p>
          <div class="demo">
            <div class="canvas-wrap">
              <div class="ball"
                   style={`transform:translate(${this.ballX}px,${this.ballY}px);`}></div>
              <span class="fps">{this.fps} fps</span>
            </div>
            <button onClick={() => { this.animPaused = !this.animPaused; }}>
              {this.animPaused ? "▶ Play" : "⏸ Pause"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
