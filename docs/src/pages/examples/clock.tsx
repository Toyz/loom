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
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <live-clock></live-clock>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@reactive</span> — <code>time</code> triggers re-render every tick</li>
            <li><span class="ic">@interval(1000)</span> — Auto-cleaned repeating timer</li>
            <li><span class="ic">@styles(sheet)</span> — Scoped CSS via adopted stylesheet</li>
            <li><span class="ic">@unmount</span> — Lifecycle hook (interval auto-cleaned by Loom)</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/live-clock.tsx"></source-block>
        </section>
      </div>
    );
  }
}
