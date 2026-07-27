/**
 * Attributes Showcase — live demo of LoomAttribute / @attribute.
 *
 * Demonstrates: @attribute, LoomAttribute, this.arg, @prop object args,
 * @observer on a controller, and update() rendering as a portal with @styles.
 */
import { LoomElement, component, reactive, prop, styles, css, LoomAttribute, attribute, observer } from "@toyz/loom";
import { t } from "../../../tokens";

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
    background: ${t.surface2};
    color: ${t.text};
    border: 1px solid ${t.accent};
    padding: 4px 10px;
    border-radius: 0;
    font-size: 12px;
    font-family: ${t.fontSans};
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
    background: ${t.surface2};
    border: 1px solid ${t.border};
    border-radius: 0;
  }
  .tip {
    color: ${t.accent};
    text-decoration: underline dotted;
    cursor: help;
    font-weight: 600;
  }
  input {
    width: 100%;
    padding: 8px 10px;
    border-radius: 0;
    border: 1px solid ${t.border};
    background: ${t.surface};
    color: ${t.text};
    box-sizing: border-box;
  }
  .reveal {
    text-align: center;
    color: ${t.textMuted};
    transition: color 0.3s;
  }
  .reveal.seen { color: ${t.emerald}; }
  .count { color: ${t.accent}; font-variant-numeric: tabular-nums; }
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
