/**
 * Core — text()  /text
 *
 * HTML entity decoder reference page.
 */
import { LoomElement } from "@toyz/loom";

export default class PageText extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="text()" subtitle="Zero-allocation HTML entity decoder for safe JSX rendering."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--amber)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Decodes common HTML entities (<span class="ic">&amp;lt;</span>, <span class="ic">&amp;gt;</span>,
              <span class="ic">&amp;amp;</span>, etc.) back to their literal characters. Use when rendering
              server-escaped strings in JSX.
            </div>
            <doc-notification type="note">
              <strong>Safe by design:</strong> The decoded string is inserted as a text node —
              the browser cannot interpret it as HTML. No sanitizer needed.
            </doc-notification>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--accent)"></loom-icon>
            <h2>Usage</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">text(escaped: string): string</div>
            <div class="dec-desc">
              Decodes HTML entities and returns a plain string.
            </div>
            <code-block lang="ts" code={`import { text } from "@toyz/loom";

@component("chat-message")
class ChatMessage extends LoomElement {
  @prop() accessor message = "";

  update() {
    // Server sends: "tea time &lt;3"
    // Without text(): shows "tea time &lt;3"
    // With text():    shows "tea time <3"
    return <p>{text(this.message)}</p>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--cyan)"></loom-icon>
            <h2>Supported Entities</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Entity</th><th>Decoded</th><th>Name</th></tr></thead>
            <tbody>
              <tr><td><code>&amp;amp;</code></td><td><code>&amp;</code></td><td>Ampersand</td></tr>
              <tr><td><code>&amp;lt;</code></td><td><code>&lt;</code></td><td>Less than</td></tr>
              <tr><td><code>&amp;gt;</code></td><td><code>&gt;</code></td><td>Greater than</td></tr>
              <tr><td><code>&amp;quot;</code></td><td><code>"</code></td><td>Double quote</td></tr>
              <tr><td><code>&amp;#39;</code></td><td><code>'</code></td><td>Single quote</td></tr>
              <tr><td><code>&amp;#x27;</code></td><td><code>'</code></td><td>Single quote (hex)</td></tr>
              <tr><td><code>&amp;#x2F;</code></td><td><code>/</code></td><td>Forward slash</td></tr>
              <tr><td><code>&amp;#x60;</code></td><td><code>`</code></td><td>Backtick</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--emerald)"></loom-icon>
            <h2>Why not innerHTML?</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">text()</span> is a pure regex replacement — <strong>zero DOM allocation</strong>.
              No <span class="ic">DOMParser</span>, no <span class="ic">&lt;textarea&gt;</span> hack,
              no hidden element creation. It works in Web Workers, SSR contexts, and
              anywhere JavaScript runs.
            </div>
            <code-block lang="ts" code={`// Does NOT double-decode
text("&amp;lt;")  // → "&lt;" (not "<")

// Unknown entities pass through
text("&nbsp;")     // → "&nbsp;" (unchanged)`}></code-block>
          </div>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
