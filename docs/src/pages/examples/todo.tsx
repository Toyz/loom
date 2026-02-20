/**
 * Example — Todo List
 *
 * Live demo: @store, @computed, @query, @styles, LocalAdapter, loom-icon
 */
import { LoomElement } from "@toyz/loom";
import "./components/todo-list";

export default class ExampleTodo extends LoomElement {
  update() {
    return (
      <div>
        <h1>Todo List</h1>
        <p class="subtitle">
          A persistent todo list using{" "}
          <span class="ic">@store</span> with <span class="ic">LocalAdapter</span>,{" "}
          <span class="ic">@computed</span>, and <span class="ic">@styles</span>.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20}></loom-icon>
            <h2>Demo</h2>
          </div>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Try adding todos, then refresh — they persist via localStorage.
          </p>
          <todo-list></todo-list>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20}></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@store</span> — Deep-proxy reactive state with automatic persistence</li>
            <li><span class="ic">LocalAdapter</span> — Todos survive page refreshes via localStorage</li>
            <li><span class="ic">@computed</span> — Derived <span class="ic">filtered</span> list recalculates only when dependencies change</li>
            <li><span class="ic">@styles</span> — Auto-adopt scoped CSS on connect</li>
            <li><span class="ic">@query</span> — Direct DOM ref to the input element</li>
            <li><span class="ic">loom-icon</span> — SVG icons from the icon registry</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/todo-list.tsx"></source-block>
        </section>
      </div>
    );
  }
}
