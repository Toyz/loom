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
                        <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
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
    return <button onClick={() => this.copyLink()}>📋 Copy Link</button>;
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
