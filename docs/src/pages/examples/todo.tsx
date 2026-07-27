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
        <doc-header title="Todo List" subtitle="A persistent todo list using @store with LocalAdapter, @computed, and @styles."></doc-header>

        <section>
          <p>A todo list is the standard example because it exercises the awkward parts: a list that reorders, an item edited in place, and state that has to survive a reload. Reload the page — the list is still here, because <span class="ic">@store</span> is backed by a storage adapter.</p>
        </section>

        <doc-section heading="Demo">
          <doc-demo note="Try adding todos, then refresh — they persist via localStorage.">
            <todo-list></todo-list>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@store</span> — Deep-proxy reactive state with automatic persistence</li>
            <li><span class="ic">LocalAdapter</span> — Todos survive page refreshes via localStorage</li>
            <li><span class="ic">@computed</span> — Derived <span class="ic">filtered</span> list recalculates only when dependencies change</li>
            <li><span class="ic">@watch</span> — Reactive watcher fires on every store mutation with accurate <span class="ic">prev</span></li>
            <li><span class="ic">$reset</span> — One-call restore to initial defaults via <span class="ic">$reset_data()</span></li>
            <li><span class="ic">@styles</span> — Auto-adopt scoped CSS on connect</li>
            <li><span class="ic">@query</span> — Direct DOM ref to the input element</li>
            <li><span class="ic">loom-icon</span> — SVG icons from the icon registry</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/todo-list.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
