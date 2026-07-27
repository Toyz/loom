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
          <p>The typed bus on its own, without components in the way. Fire events and watch subscribers receive them, including the one-shot and awaited forms — useful when the question is what the bus does rather than how a component uses it.</p>
        </section>

        <doc-section heading="Demo">
          <doc-demo note="Try emitting events, setting up once/waitFor listeners, and watching inheritance + cancellation in the log.">
            <eventbus-demo></eventbus-demo>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@on(Ping)</span> — Persistent event subscription, fires on every Ping</li>
            <li><span class="ic">@on(UIEvent)</span> — Event inheritance: catches ClickEvent too (parent handler)</li>
            <li><span class="ic">bus.once()</span> — Fire-and-forget: listens for next Ping, then auto-removes</li>
            <li><span class="ic">bus.waitFor()</span> — Promise-based: awaits next Ping with 3s timeout</li>
            <li><span class="ic">event.cancel()</span> — Stops subsequent handlers from receiving the event</li>
            <li><span class="ic">ClickEvent → UIEvent</span> — Prototype chain walk dispatches to parent handlers</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/eventbus-demo.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
