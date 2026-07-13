/**
 * Loom — Attributes example
 *
 * Demonstrates LoomAttribute / @attribute: custom attribute controllers that
 * attach behavior (and even whole rendered components) to any element.
 *
 *   <input autofocus>                         behavior-only
 *   <section intersect={onSeen}>              rich fn arg + @observer
 *   <span tooltip={{ text: "Hi" }}>           @prop object args + portal render
 *   <span tooltip={{ text, to: "#other" }}>   runtime portal target
 */
import { app, reactive, prop, LoomElement, LoomAttribute, attribute, observer } from "@toyz/loom";

// ── Type the custom attributes on every element ──
declare module "@toyz/loom/jsx-runtime" {
  interface LoomCustomAttributes {
    autofocus?: boolean;
    intersect?: (el: Element) => void;
    tooltip?: { text: string; to?: string };
  }
}

// ── 1. Behavior-only: focus the host on connect ──
@attribute("autofocus")
class Autofocus extends LoomAttribute<boolean> {
  connect() { queueMicrotask(() => this.el.focus()); }
}

// ── 2. Rich fn arg + @observer (targets this.el automatically) ──
@attribute("intersect")
class Intersect extends LoomAttribute<(el: Element) => void> {
  @observer("intersection", { threshold: 0.5 })
  onVisible(e: IntersectionObserverEntry) {
    if (e.isIntersecting) this.arg(e.target);
  }
}

// ── 3. Full component wrapped onto a host — a portal tooltip ──
//    @prop object args, update() renders a bubble into #tooltip-root, and the
//    location is overridable per-element via the runtime `to` prop.
@attribute("tooltip", { target: "#tooltip-root" })
class Tooltip extends LoomAttribute {
  @prop accessor text = "";
  @reactive accessor hovered = false;

  connect() {
    const enter = () => (this.hovered = true);
    const leave = () => (this.hovered = false);
    this.el.addEventListener("mouseenter", enter);
    this.el.addEventListener("mouseleave", leave);
    this.el.classList.add("tooltip");
    this.track(() => {
      this.el.removeEventListener("mouseenter", enter);
      this.el.removeEventListener("mouseleave", leave);
    });
  }

  update() {
    if (!this.hovered) return; // nothing mounted while not hovered
    const r = this.el.getBoundingClientRect();
    return (
      <div class="bubble" style={{ left: `${r.left}px`, top: `${r.bottom + 6}px` }}>
        {this.text}
      </div>
    );
  }
}

void Autofocus; void Intersect; void Tooltip;

// ── Demo host component ──
class AttrsDemo extends LoomElement {
  @reactive accessor seenCount = 0;

  update() {
    return (
      <div style={{ maxWidth: "640px", margin: "48px auto", padding: "0 20px" }}>
        <h1>Loom attributes</h1>

        <p>
          Hover this{" "}
          <span tooltip={{ text: "Rendered into #tooltip-root" }}>tooltip word</span>{" "}
          — the bubble is a portal into a fixed layer.
        </p>

        <p>
          This one portals elsewhere at runtime:{" "}
          <span tooltip={{ text: "Same controller, different target", to: "body" }}>
            over here
          </span>.
        </p>

        <label style={{ display: "block", margin: "16px 0" }}>
          Auto-focused input: <input autofocus placeholder="focused on load" />
        </label>

        <div style={{ height: "80vh" }}></div>

        <section
          intersect={() => (this.seenCount += 1)}
          style={{ padding: "24px", background: "#1e293b", borderRadius: "10px" }}
        >
          Scroll me into view — fired {this.seenCount} time(s).
        </section>

        <div style={{ height: "40vh" }}></div>
      </div>
    );
  }
}

customElements.define("attrs-demo", AttrsDemo);

app.start();
console.log("Loom attributes example started");
