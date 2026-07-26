/**
 * Docs — @portal decorator
 *
 * Reference page for @portal — teleport content to external DOM targets.
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorPortal extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@portal" subtitle="Teleport rendered content to an external DOM target.
                    Escape shadow DOM stacking context for modals, tooltips, dropdowns."></doc-header>

        <section>
          <p>A modal rendered where it belongs logically is a modal trapped inside its parent's stacking context. Any ancestor with <span class="ic">overflow: hidden</span>, a <span class="ic">transform</span>, or a lower <span class="ic">z-index</span> will clip it, and no amount of <span class="ic">z-index: 9999</span> escapes a stacking context from the inside.</p>
          <p><span class="ic">@portal</span> renders part of the template into a different DOM target while leaving it part of this component — same state, same lifecycle, same teardown. The content lives at the end of <span class="ic">body</span>; the code lives with the component that owns it.</p>
        </section>

                <section>
                    <div class="group-header">
                        <h2>Quick Start</h2>
                    </div>
                    <code-block lang="ts" code={QUICK_START}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <h2>API</h2>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-sig">@portal(target?, options?)</div>
                        <div class="dec-desc">
                            Method decorator. The return value is morphed into a container
                            appended at <span class="ic">target</span>. Return <span class="ic">null</span> or <span class="ic">false</span> to
                            clear the portal content.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            <strong>Options:</strong>
                        </div>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>target</code></td><td>string | Element</td><td>"body"</td><td>CSS selector or Element to append portal to</td></tr>
                                <tr><td><code>className</code></td><td>string</td><td>—</td><td>CSS class(es) for the portal container</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <h2>Examples</h2>
                    </div>
                    <code-block lang="ts" code={EXAMPLES}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <h2>How It Works</h2>
                    </div>
                    <ul>
                        <li>On connect, creates a <span class="ic">{"<div data-loom-portal>"}</span> at the target</li>
                        <li>Hooks into the component's update cycle — portal re-renders alongside <span class="ic">update()</span></li>
                        <li>Uses the morph engine for efficient DOM diffing of portal content</li>
                        <li>On disconnect, removes the portal container from the DOM</li>
                        <li>Reconnecting the element re-creates the portal automatically</li>
                        <li>Multiple <span class="ic">@portal</span> decorators can target different containers</li>
                    </ul>
                    <doc-notification type="note">
                        If the target selector doesn't match any element, a warning is logged
                        and the portal is skipped — no crash.
                    </doc-notification>
                </section>
              <doc-nav></doc-nav>
      </div>
        );
    }
}

const QUICK_START = `@component("my-dialog")
class MyDialog extends LoomElement {
  @reactive accessor open = false;

  // Teleport to body — escapes all stacking contexts
  @portal("body")
  renderOverlay() {
    if (!this.open) return null;
    return <div class="backdrop">
      <div class="modal">Hello from the portal!</div>
    </div>;
  }

  update() {
    return <button onClick={() => this.open = true}>Open</button>;
  }
}`;

const EXAMPLES = `// ── Modal (default: body) ──
@portal()
renderModal() {
  return this.open ? <my-modal onClose={() => this.open = false} /> : null;
}

// ── Tooltip to specific container ──
@portal("#tooltip-layer")
renderTooltip() {
  if (!this.hovered) return null;
  return <div class="tooltip" style={this.tooltipStyle}>
    {this.tooltipText}
  </div>;
}

// ── With custom className ──
@portal({ target: "body", className: "dropdown-portal" })
renderDropdown() {
  return this.menuOpen ? <ul class="menu">...</ul> : null;
}

// ── Multiple portals on one component ──
@portal("#notifications")
renderNotification() { return <toast-message text={this.msg} />; }

@portal("#modals")
renderConfirm() { return this.confirming ? <confirm-dialog /> : null; }`;
