/**
 * Docs — @clipboard decorator
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorClipboard extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@clipboard" subtitle="Declarative clipboard read/write. Copy return values or handle paste events with a single decorator."></doc-header>

        <section>
          <p>The Clipboard API is asynchronous, permission-gated, and only callable from inside a real user gesture. Code that reads well — build the text, await the write, show a confirmation — tends to lose the gesture somewhere in the middle and fail in Safari only.</p>
          <p><span class="ic">@clipboard</span> keeps the call on the gesture. In write mode the method's return value is what gets copied; in read mode the method receives what was pasted. Either way the permission and the async plumbing stay out of your method body.</p>
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
                        <div class="dec-sig">@clipboard("write")</div>
                        <div class="dec-desc">
                            Method decorator. Calling the method copies its return value to the clipboard
                            via <code>navigator.clipboard.writeText()</code>. Falls back to <code>execCommand("copy")</code>.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-sig">@clipboard("read")</div>
                        <div class="dec-desc">
                            Method decorator. Binds a <code>paste</code> event listener on the element.
                            The method receives the pasted text as its first argument.
                        </div>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <h2>Examples</h2>
                    </div>
                    <code-block lang="ts" code={EXAMPLES}></code-block>
                </section>
              <doc-nav></doc-nav>
      </div>
        );
    }
}

const QUICK_START = `import { LoomElement, component } from "@toyz/loom";
import { clipboard } from "@toyz/loom/element";

@component("share-button")
class ShareButton extends LoomElement {
  url = "https://example.com";

  @clipboard("write")
  copyLink() { return this.url; }

  update() {
    return <button onClick={() => this.copyLink()}>Copy link</button>;
  }
}`;

const EXAMPLES = `// ── Copy to clipboard ──
@clipboard("write")
copyCode() {
  return this.codeBlock.textContent;
}

// ── Handle paste ──
@clipboard("read")
onPaste(text: string) {
  this.content = text;
  this.scheduleUpdate();
}

// ── Copy with feedback ──
@clipboard("write")
copyAndNotify() {
  this.showToast("Copied!");
  return this.shareUrl;
}`;
