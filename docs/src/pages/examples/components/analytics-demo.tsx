/**
 * Analytics Demo Component — <analytics-demo>
 *
 * Interactive demo of @track with MockAnalytics.
 * Shows tracked buttons, tracked accessor, and live event log.
 */
import {
  LoomElement,
  component,
  reactive,
  css,
  styles,
  app,
} from "@toyz/loom";
import { AnalyticsTransport, track } from "@toyz/loom-analytics";
import { MockAnalytics } from "@toyz/loom-analytics/testing";
import { scrollbar } from "../../../shared/scrollbar";

// Register MockAnalytics as the transport
const analytics = new MockAnalytics();
app.use(AnalyticsTransport, analytics);

// ── Styles ──

const demoStyles = css`
  :host {
    display: block;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .demo-grid { grid-template-columns: 1fr; }
  }

  .panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .panel h3 {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    color: #34d399;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel h3 .badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(52,211,153,0.15);
    color: #6ee7b7;
    font-weight: 600;
  }

  .action-card {
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

  .action-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(52,211,153,0.2);
  }

  .action-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .action-info {
    flex: 1;
    min-width: 0;
  }

  .action-label {
    font-weight: 600;
    font-size: 0.85rem;
    color: #e2e8f0;
  }

  .action-event {
    font-size: 0.75rem;
    color: #64748b;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  button {
    background: rgba(52,211,153,0.12);
    color: #6ee7b7;
    border: 1px solid rgba(52,211,153,0.2);
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-weight: 500;
  }

  button:hover {
    background: rgba(52,211,153,0.2);
    border-color: rgba(52,211,153,0.35);
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  button.accent {
    background: rgba(99,102,241,0.12);
    color: #a5b4fc;
    border-color: rgba(99,102,241,0.2);
  }

  button.accent:hover {
    background: rgba(99,102,241,0.2);
    border-color: rgba(99,102,241,0.35);
  }

  button.danger {
    background: rgba(239,68,68,0.1);
    color: #fca5a5;
    border-color: rgba(239,68,68,0.2);
  }

  button.danger:hover {
    background: rgba(239,68,68,0.18);
    border-color: rgba(239,68,68,0.35);
  }

  .theme-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-weight: 600;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .theme-badge.dark {
    background: rgba(99,102,241,0.15);
    color: #a5b4fc;
  }

  .theme-badge.light {
    background: rgba(251,191,36,0.15);
    color: #fbbf24;
  }

  .log-panel {
    grid-column: 1 / -1;
  }

  .event-entries {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.75rem;
    max-height: 200px;
    overflow-y: auto;
    padding: 0.75rem;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    line-height: 1.6;
  }

  .event-entry {
    padding: 0.4rem 0.6rem;
    margin-bottom: 0.35rem;
    border-radius: 6px;
    background: rgba(255,255,255,0.02);
    border-left: 3px solid rgba(52,211,153,0.4);
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .event-entry:nth-child(even) {
    border-left-color: rgba(99,102,241,0.4);
  }

  .event-name {
    color: #34d399;
    font-weight: 600;
    white-space: nowrap;
  }

  .event-meta {
    color: #64748b;
    font-size: 0.7rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-time {
    color: #475569;
    font-size: 0.65rem;
    margin-left: auto;
    white-space: nowrap;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100px;
    color: #475569;
    font-size: 0.85rem;
    font-style: italic;
  }

  .stats-row {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .stat-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  .stat-dot.green { background: #34d399; }
  .stat-dot.blue { background: #6366f1; }
  .stat-dot.orange { background: #fb923c; }

  .btn-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }
`;

@component("analytics-demo")
@styles(demoStyles, scrollbar)
class AnalyticsDemo extends LoomElement {
  @reactive accessor eventCount = 0;
  @reactive accessor clickCount = 0;

  @track("theme.change")
  accessor currentTheme = "dark";

  @track("button.save")
  handleSave() {
    // Simulated save action
  }

  @track("button.delete", { variant: "danger" })
  handleDelete() {
    // Simulated delete action
  }

  @track("user.search", { source: "searchbar" })
  handleSearch() {
    // Simulated search
  }

  // Dynamic metadata — fn receives the element instance
  @track("button.like", (el: any) => ({ clicks: el.clickCount, theme: el.currentTheme }))
  handleLike() {
    this.clickCount++;
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.refresh();
  }

  refresh() {
    this.eventCount = analytics.events.length;
    this.scheduleUpdate();
  }

  clearLog() {
    analytics.reset();
    this.eventCount = 0;
    this.scheduleUpdate();
  }

  formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en", { hour12: false });
  }

  update() {
    const events = [...analytics.events].reverse();
    const methodEvents = analytics.events.filter((e: any) => e.meta?.method).length;
    const accessorEvents = analytics.events.filter((e: any) => e.meta?.property).length;
    const classEvents = analytics.events.filter((e: any) => e.meta?.element).length;

    return (
      <div>
        <div class="demo-grid">
          {/* Left: Actions */}
          <div class="panel">
            <h3>
              Actions <span class="badge">@track</span>
            </h3>

            <div class="action-card" onClick={() => { this.handleSave(); this.refresh(); }}>
              <div class="action-icon" style={{ background: "rgba(52,211,153,0.15)" }}>💾</div>
              <div class="action-info">
                <div class="action-label">Save Document</div>
                <div class="action-event">@track("button.save")</div>
              </div>
              <button>Fire</button>
            </div>

            <div class="action-card" onClick={() => { this.handleDelete(); this.refresh(); }}>
              <div class="action-icon" style={{ background: "rgba(239,68,68,0.15)" }}>🗑️</div>
              <div class="action-info">
                <div class="action-label">Delete Item</div>
                <div class="action-event">@track("button.delete")</div>
              </div>
              <button class="danger">Fire</button>
            </div>

            <div class="action-card" onClick={() => { this.handleSearch(); this.refresh(); }}>
              <div class="action-icon" style={{ background: "rgba(99,102,241,0.15)" }}>🔍</div>
              <div class="action-info">
                <div class="action-label">Search Users</div>
                <div class="action-event">@track("user.search")</div>
              </div>
              <button class="accent">Fire</button>
            </div>

            <div class="action-card" onClick={() => { this.handleLike(); this.refresh(); }}>
              <div class="action-icon" style={{ background: "rgba(251,191,36,0.15)" }}>👍</div>
              <div class="action-info">
                <div class="action-label">Like (dynamic meta)</div>
                <div class="action-event">@track("button.like", el =&gt; (...))</div>
              </div>
              <button class="accent">Fire</button>
            </div>
          </div>

          {/* Right: Accessor + Controls */}
          <div class="panel">
            <h3>
              State Tracking <span class="badge">accessor</span>
            </h3>

            <div class="action-card">
              <div class="action-icon" style={{ background: "rgba(251,191,36,0.15)" }}>🎨</div>
              <div class="action-info">
                <div class="action-label">Theme</div>
                <div class="action-event">@track("theme.change")</div>
              </div>
              <span class={`theme-badge ${this.currentTheme}`}>{this.currentTheme}</span>
              <button class="accent" onClick={() => this.toggleTheme()}>Toggle</button>
            </div>

            <div class="stats-row">
              <span class="stat">
                <span class="stat-dot green"></span>
                Methods: {methodEvents}
              </span>
              <span class="stat">
                <span class="stat-dot blue"></span>
                Accessors: {accessorEvents}
              </span>
              <span class="stat">
                <span class="stat-dot orange"></span>
                Classes: {classEvents}
              </span>
            </div>

            <div class="btn-row">
              <button class="danger" onClick={() => this.clearLog()}>
                Clear ({this.eventCount})
              </button>
            </div>
          </div>

          {/* Bottom: Event Log */}
          <div class="panel log-panel">
            <h3>
              Event Log <span class="badge">MockAnalytics</span>
            </h3>
            <div class="event-entries">
              {events.length === 0 ? (
                <div class="empty-state">
                  Click an action above to see events appear here…
                </div>
              ) : (
                events.map(e => (
                  <div class="event-entry">
                    <span class="event-name">{e.event}</span>
                    {e.meta && (
                      <span class="event-meta">{JSON.stringify(e.meta)}</span>
                    )}
                    <span class="event-time">{this.formatTime(e.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
