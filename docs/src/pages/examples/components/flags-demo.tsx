/**
 * Flags Demo Component — <flags-demo>
 *
 * Interactive demo of @flag and <loom-flag> with MockFlags.
 * Toggle flags on/off, see @flag-gated methods and <loom-flag> slots react in real time.
 */
import {
  LoomElement,
  component,
  reactive,
  css,
  styles,
  app,
  on,
} from "@toyz/loom";
import { FlagProvider, flag, FlagChanged } from "@toyz/loom-flags";
import { MockFlags } from "@toyz/loom-flags/testing";
import { scrollbar } from "../../../shared/scrollbar";

// Register MockFlags as the provider
const flags = new MockFlags();
app.use(FlagProvider, flags);

// ── Styles ──

const demoStyles = css`
  :host { display: block; }

  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1rem;
  }
  @media (max-width: 768px) { .demo-grid { grid-template-columns: 1fr; } }

  .panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .panel h3 {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    color: #a78bfa;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel h3 .badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(167,139,250,0.15);
    color: #c4b5fd;
    font-weight: 600;
  }

  .flag-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 0.5rem;
    transition: all 0.2s;
  }

  .flag-row:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(167,139,250,0.2);
  }

  .flag-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .flag-info {
    flex: 1;
    min-width: 0;
  }

  .flag-label {
    font-weight: 600;
    font-size: 0.85rem;
    color: #e2e8f0;
  }

  .flag-key {
    font-size: 0.75rem;
    color: #64748b;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .toggle-btn {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid;
    font-family: inherit;
  }

  .toggle-btn.on {
    background: rgba(52,211,153,0.15);
    color: #6ee7b7;
    border-color: rgba(52,211,153,0.3);
  }

  .toggle-btn.off {
    background: rgba(239,68,68,0.1);
    color: #fca5a5;
    border-color: rgba(239,68,68,0.2);
  }

  .toggle-btn:hover { transform: translateY(-1px); }

  button {
    background: rgba(167,139,250,0.12);
    color: #c4b5fd;
    border: 1px solid rgba(167,139,250,0.2);
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-weight: 500;
  }

  button:hover {
    background: rgba(167,139,250,0.2);
    border-color: rgba(167,139,250,0.35);
    transform: translateY(-1px);
  }

  .result-panel { grid-column: 1 / -1; }

  .result-box {
    padding: 1rem;
    border-radius: 8px;
    background: rgba(0,0,0,0.3);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.8rem;
    min-height: 60px;
  }

  .result-item {
    padding: 0.4rem 0.6rem;
    margin-bottom: 0.35rem;
    border-radius: 6px;
    background: rgba(255,255,255,0.02);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot.green { background: #34d399; }
  .dot.red { background: #f87171; }

  .gated-text {
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80px;
    color: #475569;
    font-size: 0.85rem;
    font-style: italic;
  }
`;

// ── Demo Component ──

const FLAG_KEYS = ["dark-mode", "beta-export", "search-v2", "new-sidebar"];

@component("flags-demo")
@styles(demoStyles, scrollbar)
class FlagsDemo extends LoomElement {
  @reactive accessor methodLog: string[] = [];
  @reactive accessor flagSnapshot: Record<string, boolean> = {};

  connectedCallback() {
    super.connectedCallback();
    this._syncSnapshot();
  }

  // Listen for flag changes on the bus — re-sync reactive snapshot
  @on(FlagChanged)
  private _onFlagChanged() {
    this._syncSnapshot();
  }

  private _syncSnapshot() {
    const snap: Record<string, boolean> = {};
    for (const key of FLAG_KEYS) snap[key] = flags.isEnabled(key);
    this.flagSnapshot = snap;
  }

  isOn(key: string) {
    return this.flagSnapshot[key] ?? false;
  }

  // Method gated by @flag
  @flag("beta-export")
  doExport() {
    this.methodLog = [...this.methodLog, `Export executed at ${new Date().toLocaleTimeString("en", { hour12: false })}`];
  }

  @flag("search-v2")
  doSearch() {
    this.methodLog = [...this.methodLog, `Search v2 executed at ${new Date().toLocaleTimeString("en", { hour12: false })}`];
  }

  toggleFlag(name: string) {
    if (flags.isEnabled(name)) {
      flags.disable(name);
    } else {
      flags.enable(name);
    }
    // FlagChanged fires on bus → @on handler re-syncs snapshot → reactive re-render
  }

  clearLog() {
    this.methodLog = [];
  }

  update() {
    const flagList = [
      { key: "dark-mode", label: "Dark Mode", icon: "🌙", desc: "UI theme toggle" },
      { key: "beta-export", label: "Beta Export", icon: "📦", desc: "Gated method" },
      { key: "search-v2", label: "Search v2", icon: "🔍", desc: "Gated method" },
      { key: "new-sidebar", label: "New Sidebar", icon: "📐", desc: "<loom-flag> slot" },
    ];

    return (
      <div>
        <div class="demo-grid">
          {/* Left: Flag Toggles */}
          <div class="panel">
            <h3>
              Flag Controls <span class="badge">FlagProvider</span>
            </h3>
            {flagList.map(f => (
              <div class="flag-row">
                <div class="flag-icon" style={{ background: this.isOn(f.key) ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.1)" }}>
                  {f.icon}
                </div>
                <div class="flag-info">
                  <div class="flag-label">{f.label}</div>
                  <div class="flag-key">{f.key} — {f.desc}</div>
                </div>
                <span
                  class={`toggle-btn ${this.isOn(f.key) ? "on" : "off"}`}
                  onClick={() => this.toggleFlag(f.key)}
                >
                  {this.isOn(f.key) ? "ON" : "OFF"}
                </span>
              </div>
            ))}
          </div>

          {/* Right: Gated Methods */}
          <div class="panel">
            <h3>
              Gated Methods <span class="badge">@flag</span>
            </h3>
            <p class="gated-text">
              These methods are guarded by <span class="ic">@flag</span> — they no-op when the flag is off.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => this.doExport()}>
                Run Export
              </button>
              <button onClick={() => this.doSearch()}>
                Run Search v2
              </button>
              <button style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.2)" }} onClick={() => this.clearLog()}>
                Clear Log
              </button>
            </div>

            <div class="result-box" style={{ marginTop: "0.75rem" }}>
              {this.methodLog.length === 0
                ? <div class="empty-state">Enable a flag, then click its method…</div>
                : this.methodLog.map((msg: string) => (
                    <div class="result-item">
                      <span class="dot green"></span>
                      {msg}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* Bottom: Live Flag State */}
          <div class="panel result-panel">
            <h3>
              Live State <span class="badge">reactive</span>
            </h3>
            <div class="result-box">
              {flagList.map(f => (
                <div class="result-item">
                  <span class={`dot ${this.isOn(f.key) ? "green" : "red"}`}></span>
                  <span style={{ color: "#a78bfa", fontWeight: "600" }}>{f.key}</span>
                  <span style={{ color: "#64748b" }}>→</span>
                  <span style={{ color: this.isOn(f.key) ? "#6ee7b7" : "#fca5a5" }}>
                    {this.isOn(f.key) ? "enabled" : "disabled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
