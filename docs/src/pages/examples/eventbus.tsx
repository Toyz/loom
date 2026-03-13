/**
 * Example — EventBus
 *
 * Live demo: bus.once, bus.waitFor, event.cancel, event inheritance, @on, @on.once
 */
import { LoomElement } from "@toyz/loom";
import "./components/eventbus-demo";

export default class ExampleEventBus extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="EventBus" subtitle="Interactive playground for once(), waitFor(), cancel(), and event inheritance."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Try emitting events, setting up once/waitFor listeners, and watching inheritance + cancellation in the log.
          </p>
          <eventbus-demo></eventbus-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@on(Ping)</span> — Persistent event subscription, fires on every Ping</li>
            <li><span class="ic">@on(UIEvent)</span> — Event inheritance: catches ClickEvent too (parent handler)</li>
            <li><span class="ic">bus.once()</span> — Fire-and-forget: listens for next Ping, then auto-removes</li>
            <li><span class="ic">bus.waitFor()</span> — Promise-based: awaits next Ping with 3s timeout</li>
            <li><span class="ic">event.cancel()</span> — Stops subsequent handlers from receiving the event</li>
            <li><span class="ic">ClickEvent → UIEvent</span> — Prototype chain walk dispatches to parent handlers</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/eventbus-demo.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
