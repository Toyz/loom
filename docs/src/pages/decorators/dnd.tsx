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
                        <div class="dec-sig">@draggable(options?)</div>
                        <div class="dec-desc">
                            Method decorator. Sets <code>draggable="true"</code> on connect, wires <code>dragstart</code>/<code>dragend</code>.
                            The method returns the drag data string. Adds/removes a <code>"dragging"</code> CSS class during drag.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc"><strong>DraggableOptions:</strong></div>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>type</code></td><td>string</td><td>"text/plain"</td><td>MIME type key for dataTransfer</td></tr>
                                <tr><td><code>effect</code></td><td>string</td><td>"move"</td><td>effectAllowed value</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-sig">@dropzone(options?)</div>
                        <div class="dec-desc">
                            Method decorator. Wires <code>dragover</code>/<code>dragleave</code>/<code>drop</code> with proper
                            <code>preventDefault()</code>. The method receives the transferred data string and the <code>DragEvent</code>.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc"><strong>DropzoneOptions:</strong></div>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>accept</code></td><td>string</td><td>"text/plain"</td><td>MIME type key to read from dataTransfer</td></tr>
                                <tr><td><code>effect</code></td><td>string</td><td>"move"</td><td>dropEffect value</td></tr>
                                <tr><td><code>overClass</code></td><td>string</td><td>"drag-over"</td><td>CSS class applied during dragover</td></tr>
                                <tr><td><code>over</code></td><td>{"() => Node | string"}</td><td>—</td><td>JSX overlay rendered during dragover, removed on leave/drop</td></tr>
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

// ── File-like reorder ──
@draggable({ type: "text/uri-list", effect: "copy" })
getDragUrl() {
  return this.fileUrl;
}`;
