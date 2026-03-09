/**
 * Docs — @media decorator
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorMedia extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@media" subtitle="Reactive media query binding. Auto-syncs a boolean accessor with matchMedia — updates on viewport or preference changes."></doc-header>

                <section>
                    <div class="group-header">
                        <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
                        <h2>Quick Start</h2>
                    </div>
                    <code-block lang="ts" code={QUICK_START}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
                        <h2>API</h2>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-sig">@media(query)</div>
                        <div class="dec-desc">
                            Accessor decorator. Binds a <code>boolean</code> field to a CSS media query
                            via <code>matchMedia</code>. Sets the initial value on connect and updates
                            reactively whenever the match state changes. Cleanup is automatic on disconnect.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            <strong>Parameters:</strong>
                        </div>
                        <table class="api-table">
                            <thead><tr><th>Param</th><th>Type</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>query</code></td><td>string</td><td>CSS media query string, e.g. <code>"(max-width: 768px)"</code></td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
                        <h2>Examples</h2>
                    </div>
                    <code-block lang="ts" code={EXAMPLES}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
                        <h2>How It Works</h2>
                    </div>
                    <ul>
                        <li>On connect, calls <span class="ic">window.matchMedia(query)</span> and reads <span class="ic">.matches</span></li>
                        <li>Listens for <span class="ic">change</span> events on the <span class="ic">MediaQueryList</span></li>
                        <li>Updates the field and calls <span class="ic">scheduleUpdate()</span> to trigger a re-render</li>
                        <li>On disconnect, removes the change event listener</li>
                        <li>Multiple <span class="ic">@media</span> decorators on different fields work independently</li>
                    </ul>
                </section>
              <doc-nav></doc-nav>
      </div>
        );
    }
}

const QUICK_START = `import { LoomElement, component } from "@toyz/loom";
import { media } from "@toyz/loom/element";

@component("responsive-layout")
class ResponsiveLayout extends LoomElement {
  @media("(max-width: 768px)")
  accessor isMobile = false;

  update() {
    return this.isMobile
      ? <div class="mobile-layout">Mobile view</div>
      : <div class="desktop-layout">Desktop view</div>;
  }
}`;

const EXAMPLES = `// ── Dark mode detection ──
@media("(prefers-color-scheme: dark)")
accessor prefersDark = false;

// ── Reduced motion ──
@media("(prefers-reduced-motion: reduce)")
accessor reducedMotion = false;

// ── Landscape orientation ──
@media("(orientation: landscape)")
accessor isLandscape = false;

// ── Composite queries ──
@media("(min-width: 1024px) and (hover: hover)")
accessor isDesktopWithMouse = false;

// ── Use in update() ──
update() {
  return <div>
    <p>{this.prefersDark ? "🌙 Dark" : "☀️ Light"}</p>
    <p>{this.reducedMotion ? "Calm mode" : "Full animations"}</p>
  </div>;
}`;
