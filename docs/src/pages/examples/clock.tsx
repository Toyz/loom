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
        <h1>Live Clock</h1>
        <p class="subtitle">
          A real-time clock using <span class="ic">@reactive</span>,{" "}
          <span class="ic">@interval</span>, and{" "}
          <span class="ic">@styles</span>.
        </p>

        <section>
          <h2>Demo</h2>
          <live-clock></live-clock>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">@reactive</span> — <code>time</code> triggers re-render every tick</li>
            <li><span class="ic">@interval(1000)</span> — Auto-cleaned repeating timer</li>
            <li><span class="ic">@styles(sheet)</span> — Scoped CSS via adopted stylesheet</li>
            <li><span class="ic">@unmount</span> — Lifecycle hook (interval auto-cleaned by Loom)</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <source-block file="docs/src/pages/examples/components/live-clock.tsx"></source-block>
        </section>
      </div>
    );
  }
}
