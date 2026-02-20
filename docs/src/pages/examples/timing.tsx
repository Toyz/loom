/**
 * Example — Timing Showcase
 *
 * Live demos for all 5 timing decorators.
 */
import { LoomElement } from "@toyz/loom";
import "./components/timing-showcase";

export default class ExampleTiming extends LoomElement {
  update() {
    return (
      <div>
        <h1>Timing Decorators</h1>
        <p class="subtitle">
          Interactive demos for <span class="ic">@interval</span>,{" "}
          <span class="ic">@timeout</span>, <span class="ic">@debounce</span>,{" "}
          <span class="ic">@throttle</span>, and <span class="ic">@animationFrame</span>.
        </p>

        <section>
          <timing-showcase></timing-showcase>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20}></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@interval</span> — Repeating timer with auto-cleanup on disconnect</li>
            <li><span class="ic">@timeout</span> — One-shot timer that runs once then cleans up</li>
            <li><span class="ic">@debounce(300)</span> — Waits for 300ms of inactivity before firing</li>
            <li><span class="ic">@throttle(60)</span> — Rate-limits calls to at most once per 60ms</li>
            <li><span class="ic">@animationFrame</span> — Centralized rAF loop with layer ordering</li>
            <li>All timers auto-clean on disconnect — zero manual teardown</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/timing-showcase.tsx"></source-block>
        </section>
      </div>
    );
  }
}
