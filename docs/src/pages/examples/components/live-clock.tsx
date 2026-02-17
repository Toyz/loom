/**
 * Live Clock — A real-time clock component.
 *
 * Demonstrates: @component, @reactive, @interval, @mount, @unmount, @styles, css
 */
import { LoomElement, component, reactive, css, styles, mount, unmount, interval } from "@toyz/loom";

const sheet = css`
  :host { display: block; }
  .clock {
    font-size: 3.5rem;
    font-weight: 200;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    color: var(--accent, #a78bfa);
    text-align: center;
    padding: 2rem;
    border-radius: 12px;
    background: var(--surface-2, #1e1e2e);
    border: 1px solid var(--border, #333);
  }
  .label {
    text-align: center;
    color: var(--text-muted, #888);
    margin-top: 0.75rem;
    font-size: 0.85rem;
  }
`;

@component("live-clock")
@styles(sheet)
export class LiveClock extends LoomElement {
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
}
