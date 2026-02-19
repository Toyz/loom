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
          <h2>What This Shows</h2>
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
          <h2>Source Highlights</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `// Stopwatch — @interval ticks every 100ms
@interval(100)
tick() { this.elapsed++; }

// Toast — @timeout auto-dismisses after 3s
@timeout(3000)
hideToast() { this.toastVisible = false; }

// Search — @debounce waits for idle keystrokes
@debounce(300)
search(query: string) {
  this.debouncedCount++;
  this.debouncedValue = query;
}

// Mouse — @throttle rate-limits move events
@throttle(60)
onMove(x: number, y: number) {
  this.throttledMoves++;
  this.dotX = x; this.dotY = y;
}

// Ball — @animationFrame with layer 0
@animationFrame(0)
bounce(dt: number) {
  this.ballX += this.vx * dt;
  this.ballY += this.vy * dt;
  // wall collision…
}`;
