/**
 * Docs — @provide / @consume context
 *
 * Reference page for cross-shadow-DOM data sharing.
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorContext extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@provide / @consume" subtitle="Cross-shadow-DOM data sharing with class-based keys. Same pattern as @service."></doc-header>

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
                        <div class="dec-sig">@provide(Key)</div>
                        <div class="dec-desc">
                            Auto-accessor decorator. Makes this element a provider for the given
                            context key. If <span class="ic">Key</span> is a class constructor and no
                            initial value is set, auto-instantiates via <span class="ic">new Key()</span>.
                            Descendants can consume the value.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-sig">@consume(Key)</div>
                        <div class="dec-desc">
                            Auto-accessor decorator. Consumes a context value from the nearest
                            ancestor provider. Reactively updates when the provider changes.
                            Returns <span class="ic">undefined</span> if no provider is found.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            <strong>Key types:</strong>
                        </div>
                        <table class="api-table">
                            <thead><tr><th>Key Type</th><th>Example</th><th>Notes</th></tr></thead>
                            <tbody>
                                <tr><td>Class</td><td><code>ThemeContext</code></td><td>Full type inference, auto-instantiation</td></tr>
                                <tr><td>String</td><td><code>"locale"</code></td><td>Simple primitives</td></tr>
                                <tr><td>Symbol</td><td><code>Symbol("auth")</code></td><td>Private / collision-free</td></tr>
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
                        <li>Uses the <span class="ic">W3C Context Protocol</span> — an event-based handshake</li>
                        <li>Consumer dispatches a <span class="ic">context-request</span> event with <span class="ic">composed: true</span> (crosses shadow boundaries)</li>
                        <li>Nearest ancestor provider intercepts and calls back with the current value</li>
                        <li>Provider stores subscriber callbacks — pushes updates reactively</li>
                        <li>Both use <span class="ic">CONNECT_HOOKS</span> for auto-cleanup on disconnect</li>
                        <li>Consumer defers dispatch via <span class="ic">queueMicrotask</span> so ancestor providers connect first</li>
                    </ul>
                    <doc-notification type="note">
                        If no provider is found, the consumer stays at its initial value
                        (<span class="ic">undefined</span> for <span class="ic">!</span> accessors).
                        No errors, no warnings.
                    </doc-notification>
                </section>
              <doc-nav></doc-nav>
      </div>
        );
    }
}

const QUICK_START = `// 1. Define your context (just a class)
class ThemeContext {
  mode: "dark" | "light" = "dark";
  primary = "#818cf8";
  radius = 8;
}

// 2. Provide it (ancestor — auto-instantiated)
@component("app-shell")
class AppShell extends LoomElement {
  @provide(ThemeContext) accessor theme!: ThemeContext;
}

// 3. Consume it (any descendant — crosses shadow DOM)
@component("user-badge")
class UserBadge extends LoomElement {
  @consume(ThemeContext) accessor theme!: ThemeContext;

  update() {
    return <span style={\`color: \${this.theme.primary}\`}>
      {this.theme.mode} mode
    </span>;
  }
}`;

const EXAMPLES = `// ── Class key (recommended) ──
class AuthContext {
  user: User | null = null;
  token = "";
}

@provide(AuthContext) accessor auth!: AuthContext;
@consume(AuthContext) accessor auth!: AuthContext;

// ── String key (simple values) ──
@provide("locale") accessor locale = "en-US";
@consume("locale") accessor locale!: string;

// ── Reactive updates ──
// Changing the provider pushes to all consumers:
this.theme = { ...this.theme, mode: "light" };
// All @consume(ThemeContext) accessors update automatically

// ── Nested providers ──
// Consumer always gets the NEAREST ancestor provider.
// Inner provider overrides outer for its subtree.
@provide("level") accessor level = "outer";
  @provide("level") accessor level = "inner";
    @consume("level") accessor level!: string; // → "inner"`;
