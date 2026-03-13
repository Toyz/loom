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
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Drag cards between columns. Press <kbd style="background:var(--surface-2);padding:0.15rem 0.4rem;border-radius:4px;font-size:0.75rem;">N</kbd> to focus input. Data persists via localStorage.
          </p>
          <kanban-board></kanban-board>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@store</span> + <span class="ic">LocalAdapter</span> — Persistent card state across page refreshes</li>
            <li><span class="ic">@draggable</span> + <span class="ic">selector</span> — Per-card drag via event delegation (no sub-components needed)</li>
            <li><span class="ic">@dropzone</span> + <span class="ic">selector</span> — Per-column drop targets with automatic overClass</li>
            <li><span class="ic">@computed</span> — Filtered card lists per column, recalculated only on change</li>
            <li><span class="ic">@dynamicCss</span> — Column accent colors generated from data</li>
            <li><span class="ic">@watch</span> — Console logging on card add/remove</li>
            <li><span class="ic">@hotkey</span> — Press N to focus the To Do input</li>
            <li><span class="ic">@styles</span> + <span class="ic">css</span> — Static grid layout with scoped shadow DOM styles</li>
            <li><span class="ic">$reset</span> — One-call restore to empty board</li>
            <li><span class="ic">loom-icon</span> — SVG icons for column headers and card actions</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/kanban-board.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
