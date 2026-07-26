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
          <p>JSX escapes text by design — that is what stops a username from becoming a script tag. It also means content that legitimately contains entities, typically anything that has been through a CMS or an RSS feed, renders as the literal characters <span class="ic">&amp;amp;lt;</span> rather than as the character it encodes.</p>
          <p><span class="ic">text()</span> decodes those without opening the hole back up. It handles the named and numeric entities that actually occur, and it returns a string rather than markup, so the result is still escaped on the way into the DOM. Reach for it when the source is untrusted and the entities are real; reach for nothing at all when you control the string.</p>
        </section>

        <doc-section heading="Overview">
            <p>
              Decodes common HTML entities (<span class="ic">&amp;lt;</span>, <span class="ic">&amp;gt;</span>,
              <span class="ic">&amp;amp;</span>, etc.) back to their literal characters. Use when rendering
              server-escaped strings in JSX.
            </p>
            <doc-notification type="note">
              <strong>Safe by design:</strong> The decoded string is inserted as a text node —
              the browser cannot interpret it as HTML. No sanitizer needed.
            </doc-notification>
        </doc-section>

        <doc-section heading="Usage">
          <api-entry sig="text(escaped: string): string">
            <p>Decodes HTML entities and returns a plain string.</p>
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
          </api-entry>
        </doc-section>

        <doc-section heading="Supported Entities">
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
        </doc-section>

        <doc-section heading="Why not innerHTML?">
          <p>
            <span class="ic">text()</span> is a pure regex replacement — <strong>zero DOM allocation</strong>.
            No <span class="ic">DOMParser</span>, no <span class="ic">&lt;textarea&gt;</span> hack,
            no hidden element creation. It works in Web Workers, SSR contexts, and
            anywhere JavaScript runs.
          </p>
            <code-block lang="ts" code={`// Does NOT double-decode
text("&amp;lt;")  // → "&lt;" (not "<")

// Unknown entities pass through
text("&nbsp;")     // → "&nbsp;" (unchanged)`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
