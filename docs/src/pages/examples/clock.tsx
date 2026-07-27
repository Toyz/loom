/**
 * Example — Live Clock
 *
 * Live demo: @reactive, @interval, @mount, @unmount, @styles, css
 */
import { LoomElement } from "@toyz/loom";
import "./components/live-clock";

export default class ExampleClock extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Live Clock" subtitle="A real-time clock using @reactive, @interval, and @styles."></doc-header>

        <section>
          <p>The smallest component that is still doing something real: one reactive field, one <span class="ic">@interval</span>, one stylesheet. It is worth reading because of what is absent — no teardown, no <span class="ic">clearInterval</span>, and no lifecycle method. Navigate away and the timer stops.</p>
        </section>

        <doc-section heading="Demo">
          <doc-demo>
            <live-clock></live-clock>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@reactive</span> — <code>time</code> triggers re-render every tick</li>
            <li><span class="ic">@interval(1000)</span> — Auto-cleaned repeating timer</li>
            <li><span class="ic">@styles(sheet)</span> — Scoped CSS via adopted stylesheet</li>
            <li><span class="ic">@unmount</span> — Lifecycle hook (interval auto-cleaned by Loom)</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/live-clock.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
