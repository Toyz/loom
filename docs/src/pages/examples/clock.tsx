/**
 * Example — Clock
 *
 * Live demo: @reactive, @interval, @styles, @unmount
 */
import { LoomElement } from "@toyz/loom";
import "./components/live-clock";

export default class ExampleClock extends LoomElement {
  update() {
    return (
      <div>
        <h1>Live Clock</h1>
        <p class="subtitle">
          A real-time clock built with <span class="ic">@reactive</span>,{" "}
          <span class="ic">@interval</span>, and <span class="ic">@styles</span>.
        </p>

        <section>
          <h2>Demo</h2>
          <live-clock></live-clock>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">@reactive</span> — Assigning to <span class="ic">this.time</span> triggers a re-render</li>
            <li><span class="ic">@interval(1000)</span> — Timer that auto-cleans on disconnect</li>
            <li><span class="ic">@styles(sheet)</span> — Auto-adopted scoped CSS via class decorator</li>
            <li><span class="ic">@unmount</span> — Lifecycle hook, interval auto-cleaned by Loom</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, reactive, css, styles, unmount, interval } from "@toyz/loom";

const sheet = css\`
  .clock {
    font-size: 3.5rem;
    font-weight: 200;
    font-variant-numeric: tabular-nums;
    color: var(--accent);
    text-align: center;
    padding: 2rem;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .label {
    text-align: center;
    color: var(--text-muted);
    margin-top: 0.75rem;
    font-size: 0.85rem;
  }
\`;

@component("live-clock")
@styles(sheet)
class LiveClock extends LoomElement {
  @reactive accessor time = new Date();

  @interval(1000)
  tick() {
    this.time = new Date();
  }

  @unmount
  onUnmount() {
    // interval auto-cleaned by Loom
  }

  update() {
    const h = this.time.getHours().toString().padStart(2, "0");
    const m = this.time.getMinutes().toString().padStart(2, "0");
    const s = this.time.getSeconds().toString().padStart(2, "0");
    return (
      <div>
        <div class="clock">{h}:{m}:{s}</div>
        <p class="label">Updates every second via @interval(1000)</p>
      </div>
    );
  }
}`;
