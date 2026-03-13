/**
 * EventBus Demo — Interactive event bus playground.
 *
 * Demonstrates: EventBus, LoomEvent, @on, @on.once, bus.once, bus.waitFor, cancel, inheritance
 */
import { LoomElement, component, reactive, css, styles, store, LoomEvent, bus, on, emit } from "@toyz/loom";

// ── Events ──

class Ping extends LoomEvent {
  constructor(public message: string) { super(); }
}

class UIEvent extends LoomEvent {
  constructor(public source: string) { super(); }
}

class ClickEvent extends UIEvent {
  constructor(source: string, public x: number, public y: number) {
    super(source);
  }
}

// ── Styles ──

const sheet = css`
  :host { display: block; }
  .demo {
    display: flex; flex-direction: column; gap: 1rem;
    padding: 1.25rem; border-radius: 12px;
    background: var(--surface-2, #1e1e2e);
    border: 1px solid var(--border, #333);
  }
  .row {
    display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;
  }
  button {
    padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer;
    font-size: 0.85rem; font-weight: 500; transition: opacity 0.15s;
    color: #111;
  }
  button:hover { opacity: 0.85; }
  .btn-ping    { background: var(--amber, #fbbf24); }
  .btn-click   { background: var(--cyan, #22d3ee); }
  .btn-once    { background: var(--rose, #f472b6); }
  .btn-wait    { background: var(--emerald, #34d399); }
  .btn-cancel  { background: var(--accent, #818cf8); color: #fff; }
  .btn-clear   { background: #444; color: #ccc; }
  .log {
    background: #111; border-radius: 8px; padding: 0.75rem;
    font-family: "SF Mono", "Fira Code", monospace; font-size: 0.8rem;
    color: #ddd; max-height: 240px; overflow-y: auto;
    line-height: 1.6; min-height: 80px;
  }
  .log .entry { border-bottom: 1px solid #222; padding: 2px 0; }
  .log .entry:last-child { border-bottom: none; }
  .time { color: #666; margin-right: 0.5rem; }
  .tag { padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 0.25rem; }
  .tag-ping { background: rgba(251,191,36,0.2); color: var(--amber); }
  .tag-click { background: rgba(34,211,238,0.2); color: var(--cyan); }
  .tag-once { background: rgba(244,114,182,0.2); color: var(--rose); }
  .tag-wait { background: rgba(52,211,153,0.2); color: var(--emerald); }
  .tag-cancel { background: rgba(129,140,248,0.2); color: var(--accent); }
  .tag-inherit { background: rgba(129,140,248,0.2); color: var(--accent); }
  .section-label {
    font-size: 0.75rem; color: var(--text-muted, #888);
    text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;
  }
`;

interface LogEntry { time: string; tag: string; tagClass: string; text: string }

@component("eventbus-demo")
@styles(sheet)
export class EventBusDemo extends LoomElement {
  @store<{ entries: LogEntry[] }>({ entries: [] })
  accessor log!: { entries: LogEntry[] };

  private onceActive = false;
  private waitActive = false;

  private addLog(tag: string, tagClass: string, text: string) {
    const now = new Date();
    const time = `${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    this.log.entries = [...this.log.entries.slice(-30), { time, tag, tagClass, text }];
  }

  // ── Persistent listener ──
  @on(Ping)
  onPing(e: Ping) {
    this.addLog("PING", "tag-ping", e.message);
  }

  // ── Inheritance listener — catches ALL UIEvents ──
  @on(UIEvent)
  onUIEvent(e: UIEvent) {
    const name = e.constructor.name;
    this.addLog("INHERIT", "tag-inherit", `UIEvent handler caught ${name} from "${e.source}"`);
  }

  // ── Actions ──
  sendPing() {
    bus.emit(new Ping("Hello from the bus!"));
  }

  sendClick() {
    const x = Math.floor(Math.random() * 100);
    const y = Math.floor(Math.random() * 100);
    bus.emit(new ClickEvent("demo-button", x, y));
    this.addLog("CLICK", "tag-click", `ClickEvent(${x}, ${y}) — also fires UIEvent handler ↑`);
  }

  listenOnce() {
    if (this.onceActive) return;
    this.onceActive = true;
    this.addLog("ONCE", "tag-once", "Waiting for next Ping (one-shot)...");
    bus.once(Ping, (e) => {
      this.onceActive = false;
      this.addLog("ONCE", "tag-once", `Caught: "${e.message}" — handler removed`);
    });
  }

  async listenWaitFor() {
    if (this.waitActive) return;
    this.waitActive = true;
    this.addLog("WAIT", "tag-wait", "Awaiting Ping (3s timeout)...");
    try {
      const e = await bus.waitFor(Ping, { timeout: 3000 });
      this.addLog("WAIT", "tag-wait", `Resolved: "${e.message}"`);
    } catch {
      this.addLog("WAIT", "tag-wait", "Timed out after 3s!");
    }
    this.waitActive = false;
  }

  sendCancellable() {
    // Register two handlers, first cancels
    const unsub1 = bus.on(Ping, (e) => {
      e.cancel();
      this.addLog("CANCEL", "tag-cancel", `Handler 1 cancelled "${e.message}"`);
    });
    const unsub2 = bus.on(Ping, () => {
      this.addLog("CANCEL", "tag-cancel", "Handler 2 — should NOT appear");
    });

    bus.emit(new Ping("Cancelled event"));

    unsub1();
    unsub2();
    this.addLog("CANCEL", "tag-cancel", "Handler 2 was blocked by cancel()");
  }

  clearLog() {
    this.log.entries = [];
  }

  update() {
    return (
      <div class="demo">
        <div>
          <span class="section-label">Emit</span>
          <div class="row">
            <button class="btn-ping" onClick={() => this.sendPing()}>Emit Ping</button>
            <button class="btn-click" onClick={() => this.sendClick()}>Emit ClickEvent</button>
          </div>
        </div>

        <div>
          <span class="section-label">Advanced</span>
          <div class="row">
            <button class="btn-once" onClick={() => this.listenOnce()}>bus.once(Ping)</button>
            <button class="btn-wait" onClick={() => this.listenWaitFor()}>bus.waitFor(Ping)</button>
            <button class="btn-cancel" onClick={() => this.sendCancellable()}>Cancel Demo</button>
            <button class="btn-clear" onClick={() => this.clearLog()}>Clear Log</button>
          </div>
        </div>

        <div class="log">
          {this.log.entries.length === 0
            ? <div style="color:#555;font-style:italic;">Click a button to see events flow...</div>
            : this.log.entries.map(e => (
                <div class="entry">
                  <span class="time">{e.time}</span>
                  <span class={`tag ${e.tagClass}`}>{e.tag}</span>
                  {e.text}
                </div>
              ))
          }
        </div>
      </div>
    );
  }
}
