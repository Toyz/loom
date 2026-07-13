/**
 * Attributes Showcase — live demo of LoomAttribute / @attribute.
 *
 * Demonstrates: @attribute, LoomAttribute, this.arg, @prop object args,
 * @observer on a controller, and update() rendering as a portal with @styles.
 */
import { LoomElement, component, reactive, prop, styles, css, LoomAttribute, attribute, observer } from "@toyz/loom";

// Type the demo attributes so they check on every element.
declare module "@toyz/loom/jsx-runtime" {
  interface LoomCustomAttributes {
    "demo-autofocus"?: boolean;
    "demo-reveal"?: () => void;
    "demo-tooltip"?: { text: string };
  }
}

// ── 1. Behavior-only controller: focus the host on connect ──
@attribute("demo-autofocus")
class DemoAutofocus extends LoomAttribute<boolean> {
  connect() { queueMicrotask(() => this.el.focus()); }
}

// ── 2. Rich fn arg + @observer (auto-targets this.el) ──
@attribute("demo-reveal")
class DemoReveal extends LoomAttribute<() => void> {
  @observer("intersection", { threshold: 0.6 })
  onVisible(e: IntersectionObserverEntry) {
    if (e.isIntersecting) this.arg();
  }
}

// ── 3. Full component wrapped onto a host — a portal tooltip ──
//    @prop object args, update() renders into document.body, @styles scopes it.
const bubbleSheet = css`
  .bubble {
    position: fixed;
    transform: translateX(-50%);
    background: var(--surface-2, #1e1e2e);
    color: var(--text, #e2e8f0);
    border: 1px solid var(--accent, #a78bfa);
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-family: -apple-system, system-ui, sans-serif;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    white-space: nowrap;
  }
`;

@attribute("demo-tooltip")
@styles(bubbleSheet)
class DemoTooltip extends LoomAttribute {
  @prop accessor text = "";
  @reactive accessor hovered = false;

  connect() {
    const enter = () => (this.hovered = true);
    const leave = () => (this.hovered = false);
    this.el.addEventListener("mouseenter", enter);
    this.el.addEventListener("mouseleave", leave);
    this.track(() => {
      this.el.removeEventListener("mouseenter", enter);
      this.el.removeEventListener("mouseleave", leave);
    });
  }

  update() {
    if (!this.hovered) return;
    const r = this.el.getBoundingClientRect();
    return (
      <div class="bubble" style={{ left: `${r.left + r.width / 2}px`, top: `${r.bottom + 8}px` }}>
        {this.text}
      </div>
    );
  }
}

void DemoAutofocus; void DemoReveal; void DemoTooltip;

// ── Host demo component ──
const sheet = css`
  :host { display: block; }
  .demo { display: grid; gap: 16px; }
  .row {
    padding: 16px;
    background: var(--surface-2, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 10px;
  }
  .tip {
    color: var(--accent, #a78bfa);
    text-decoration: underline dotted;
    cursor: help;
    font-weight: 600;
  }
  input {
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--border, #333);
    background: var(--surface, #12121a);
    color: var(--text, #e2e8f0);
    box-sizing: border-box;
  }
  .reveal {
    text-align: center;
    color: var(--text-muted, #888);
    transition: color 0.3s;
  }
  .reveal.seen { color: var(--emerald, #34d399); }
  .count { color: var(--accent, #a78bfa); font-variant-numeric: tabular-nums; }
`;

@component("attributes-showcase")
@styles(sheet)
export class AttributesShowcase extends LoomElement {
  @reactive accessor revealCount = 0;

  update() {
    return (
      <div class="demo">
        <div class="row">
          Hover the <span class="tip" demo-tooltip={{ text: "I am a portal into document.body" }}>tooltip word</span> — the
          bubble is rendered by a controller, not the host.
        </div>

        <div class="row">
          <input demo-autofocus placeholder="Focused on connect via demo-autofocus" />
        </div>

        <div class={`row reveal${this.revealCount > 0 ? " seen" : ""}`}>
          <div demo-reveal={() => (this.revealCount += 1)}>
            This block fired <span class="count">{this.revealCount}</span> intersection(s) via @observer.
          </div>
        </div>
      </div>
    );
  }
}
