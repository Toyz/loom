/**
 * Example — Kanban Board
 *
 * Live demo: @store, @draggable (selector), @dropzone (selector),
 *            @computed, @dynamicCss, @hotkey, @watch, @styles, loom-icon
 */
import { LoomElement } from "@toyz/loom";
import "./components/kanban-board";

export default class ExampleKanban extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Kanban Board" subtitle="Drag & drop task management with @store persistence, @draggable/@dropzone selectors, and @dynamicCss."></doc-header>

        <section>
          <p>Drag and drop across columns, persisted. The part worth reading is the payload: a card moves between columns as data rather than as a DOM node, so the drop handler never touches the element that was dragged.</p>
        </section>

        <doc-section heading="Demo">
          <doc-demo>
            <p class="hint">
            Drag cards between columns. Press <kbd style="background:var(--surface-2);padding:0.15rem 0.4rem;border-radius:2px;font-size:0.75rem;">N</kbd> to focus input. Data persists via localStorage.
            </p>
            <kanban-board></kanban-board>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@store</span> + <span class="ic">LocalAdapter</span> — Persistent card state across page refreshes</li>
            <li><span class="ic">@draggable</span> + <span class="ic">selector</span> — Per-card drag via event delegation (no sub-components needed)</li>
            <li><span class="ic">@dropzone</span> + <span class="ic">selector</span> — Per-column drop targets with automatic overClass</li>
            <li><span class="ic">@computed</span> — Filtered card lists per column, recalculated only on change</li>
            <li><span class="ic">@dynamicCss</span> — Column accent colors generated from data</li>
            <li><span class="ic">@watch</span> — Console logging on card add/remove</li>
            <li><span class="ic">@hotkey</span> — Press N to focus the To Do input</li>
            <li><span class="ic">@query</span> + <span class="ic">LoomHtmlQuery</span> — Dynamic <span class="ic">$0</span> placeholder for parameterized element lookup</li>
            <li><span class="ic">@styles</span> + <span class="ic">css</span> — Static grid layout with scoped shadow DOM styles</li>
            <li><span class="ic">$reset</span> — One-call restore to empty board</li>
            <li><span class="ic">loom-icon</span> — SVG icons for column headers and card actions</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/kanban-board.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
