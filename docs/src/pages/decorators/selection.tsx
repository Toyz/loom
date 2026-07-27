/**
 * Decorators — Selection & Highlights  /decorators/selection
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorSelection extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Selection &amp; Highlights"
          subtitle="Read what the user selected, and style ranges of text without touching the DOM."
        ></doc-header>

        <section>
          <p>Two related things the platform does better than the usual workaround.</p>
          <p><span class="ic">@selection</span> reports what the user has selected, with the listener cleaned up — <span class="ic">selectionchange</span> fires on <span class="ic">document</span>, so a component that subscribes without unsubscribing keeps receiving events for a page it is no longer part of.</p>
          <p><span class="ic">highlight()</span> styles ranges of text <em>without wrapping them in elements</em>. The wrapping approach — the one every search highlighter reaches for — rewrites the DOM to insert <span class="ic">&lt;mark&gt;</span>, which destroys the user's selection, moves focus, invalidates node references held elsewhere, and forces a re-layout of the whole block.</p>
        </section>

        <doc-section heading="@selection">
          <code-block lang="ts" code={SELECTION}></code-block>
          <api-table
            head={["Field", "Type", "Description"]}
            rows={[
              [<code>text</code>, "string", "The selected text, empty when collapsed"],
              [<code>range</code>, "Range | null", "The live range"],
              [<code>within</code>, "boolean", "Whether the selection is inside this component"],
            ]}
          ></api-table>
          <p class="tip">
            Pass <span class="ic">{`{ withinOnly: true }`}</span> to skip selections made
            elsewhere on the page rather than filtering on{" "}
            <span class="ic">within</span> yourself.
          </p>
        </doc-section>

        <doc-section heading="CSS Custom Highlight">
          <code-block lang="ts" code={HIGHLIGHT}></code-block>
          <p>
            Nothing in the DOM changes: no wrapper elements, no text nodes split, no selection
            lost, no re-layout. The highlight paints over the existing text.
          </p>
          <api-table
            head={["Function", "Description"]}
            rows={[
              [<code>findRanges(root, term)</code>, "Every case-insensitive occurrence, as ranges"],
              [<code>highlight(name, ranges)</code>, "Registers them. Returns a function that removes the highlight"],
              [<code>supportsHighlights()</code>, "Whether the browser has CSS.highlights"],
            ]}
          ></api-table>
          <p class="note">
            Chrome and Edge 105+, Safari 17.2+, Firefox 140+. Where it is missing,{" "}
            <span class="ic">highlight()</span> returns a no-op teardown and the text simply is
            not highlighted — so it never needs a branch at the call site.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const SELECTION = `import { component, selection, type SelectionInfo } from "@toyz/loom";

@component("quote-picker")
class QuotePicker extends LoomElement {
  @reactive accessor quote = "";

  @selection({ withinOnly: true })
  onSelect(info: SelectionInfo) {
    this.quote = info.text;
  }
}`;

const HIGHLIGHT = `import { highlight, findRanges } from "@toyz/loom";

const ranges = findRanges(this.shadowRoot!, this.term);
const clear = highlight("search", ranges);
this.track(clear);

/* CSS:
   ::highlight(search) { background: #fde68a; color: inherit; }
*/`;
