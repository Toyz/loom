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
          <punch-matrix
            columns="SENDS TO CLIPBOARD,RECEIVES FROM CLIPBOARD,USES RETURN VALUE"
            rows={[
              { name: `@clipboard("write")`, punches: "SENDS TO CLIPBOARD,USES RETURN VALUE", note: "What the method returns is what gets copied" },
              { name: `@clipboard("read")`, punches: "RECEIVES FROM CLIPBOARD", note: "The method is handed the pasted text" },
            ]}
          ></punch-matrix>
        </section>

                <doc-section heading="Quick Start">
                    <code-block lang="ts" code={QUICK_START}></code-block>
                </doc-section>
                <doc-section heading="API">
                    <api-entry sig={`@clipboard("write")`}>
                        <p>
                            Method decorator. Calling the method copies its return value to the clipboard
                            via <code>navigator.clipboard.writeText()</code>. Falls back to <code>execCommand("copy")</code>.
                        </p>
                    </api-entry>
                    <api-entry sig={`@clipboard("read")`}>
                        <p>
                            Method decorator. Binds a <code>paste</code> event listener on the element.
                            The method receives the pasted text as its first argument.
                        </p>
                    </api-entry>
                </doc-section>
                <doc-section heading="Examples">
                    <code-block lang="ts" code={EXAMPLES}></code-block>
                </doc-section>
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
