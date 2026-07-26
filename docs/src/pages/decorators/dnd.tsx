/**
 * Docs — @draggable / @dropzone decorators
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorDnd extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@draggable / @dropzone" subtitle="Declarative HTML5 Drag and Drop. Make components draggable or accept drops with lifecycle-managed event handling."></doc-header>

        <section>
          <p>HTML5 drag and drop is an API with a trap in it: the drop target does nothing unless you call <span class="ic">preventDefault()</span> on <span class="ic">dragover</span>, an event you otherwise have no reason to handle. Miss it and the drop silently never fires, with no error to explain why.</p>
          <p><span class="ic">@draggable</span> and <span class="ic">@dropzone</span> handle the required event dance and leave you the two parts that carry meaning: what the payload is, and what to do when it lands. The payload is serialised from the method's return value, so a drop between components moves data rather than DOM nodes.</p>
          <punch-matrix
            columns="DRAG SOURCE,DROP TARGET,SERIALISES PAYLOAD,READS PAYLOAD"
            rows={[
              { name: "@draggable(options?)", punches: "DRAG SOURCE,SERIALISES PAYLOAD", note: "The return value becomes the payload" },
              { name: "@dropzone(options?)", punches: "DROP TARGET,READS PAYLOAD", note: "Handles the required dragover dance for you" },
            ]}
          ></punch-matrix>
        </section>

                <doc-section heading="Quick Start">
                    <code-block lang="ts" code={QUICK_START}></code-block>
                </doc-section>
                <doc-section heading="API">
                    <api-entry sig="@draggable(options?)">
                        <p>
                            Method decorator. Sets <code>draggable="true"</code> on connect, wires <code>dragstart</code>/<code>dragend</code>.
                            The method returns the drag data string. Adds/removes a <code>"dragging"</code> CSS class during drag.
                        </p>
                    </api-entry>
                        <p><strong>DraggableOptions:</strong></p>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>type</code></td><td>string</td><td>"text/plain"</td><td>MIME type key for dataTransfer</td></tr>
                                <tr><td><code>effect</code></td><td>string</td><td>"move"</td><td>effectAllowed value</td></tr>
                                <tr><td><code>selector</code></td><td>string</td><td>—</td><td>CSS selector for child elements — enables event delegation. Matched element passed as first arg to method.</td></tr>
                            </tbody>
                        </table>
                    <api-entry sig="@dropzone(options?)">
                        <p>
                            Method decorator. Wires <code>dragover</code>/<code>dragleave</code>/<code>drop</code> with proper <code>preventDefault()</code>. The method receives the transferred data string and the <code>DragEvent</code>.
                        </p>
                    </api-entry>
                        <p><strong>DropzoneOptions:</strong></p>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>accept</code></td><td>string</td><td>"text/plain"</td><td>MIME type key to read from dataTransfer</td></tr>
                                <tr><td><code>effect</code></td><td>string</td><td>"move"</td><td>dropEffect value</td></tr>
                                <tr><td><code>overClass</code></td><td>string</td><td>"drag-over"</td><td>CSS class applied during dragover</td></tr>
                                <tr><td><code>selector</code></td><td>string</td><td>—</td><td>CSS selector for child drop targets — enables event delegation. Matched element passed as third arg to method.</td></tr>
                                <tr><td><code>over</code></td><td>{"() => Node | string"}</td><td>—</td><td>JSX overlay rendered during dragover, removed on leave/drop</td></tr>
                            </tbody>
                        </table>
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
import { draggable, dropzone } from "@toyz/loom/element";

@component("task-card")
class TaskCard extends LoomElement {
  taskId = "task-1";

  @draggable({ type: "application/json" })
  getDragData() {
    return JSON.stringify({ id: this.taskId });
  }
}

@component("task-lane")
class TaskLane extends LoomElement {
  items: string[] = [];

  @dropzone({ accept: "application/json", overClass: "highlight" })
  onDrop(data: string) {
    const { id } = JSON.parse(data);
    this.items.push(id);
    this.scheduleUpdate();
  }
}`;

const EXAMPLES = `// ── Simple text drag ──
@draggable()
getDragData() {
  return this.label;
}

// ── Kanban drop with visual feedback ──
@dropzone({ accept: "application/json", overClass: "lane-hover" })
onCardDrop(data: string, event: DragEvent) {
  const card = JSON.parse(data);
  this.cards.push(card);
  this.scheduleUpdate();
}

// ── Selector-based: per-card drag (no sub-components) ──
@draggable({ type: "application/x-kanban", selector: ".card" })
getCardData(el: HTMLElement) {
  return el.dataset.id; // matched child passed as first arg
}

@dropzone({ accept: "application/x-kanban", selector: ".column" })
onDrop(data: string, e: DragEvent, target: HTMLElement) {
  // target = the matched .column child
  const columnId = target.dataset.col;
  this.moveCard(Number(data), columnId);
}

// ── File-like reorder ──
@draggable({ type: "text/uri-list", effect: "copy" })
getDragUrl() {
  return this.fileUrl;
}`;
