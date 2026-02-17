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
          <h2>Demo</h2>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Try adding todos, then refresh — they persist via localStorage.
          </p>
          <todo-list></todo-list>
        </section>

        <section>
          <h2>What This Shows</h2>
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
          <h2>Source</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, computed, query, css, styles, store, LocalAdapter } from "@toyz/loom";

interface Todo { id: number; text: string; done: boolean; }

const sheet = css\`
  .todo-input { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
  .todo-input input {
    flex: 1; padding: 0.75rem 1rem;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface-2); color: var(--text);
  }
  .todo-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 0.85rem; margin-bottom: 0.35rem;
    border-radius: 8px; background: var(--surface-2);
    border: 1px solid var(--border);
  }
  .todo-item.done .text { text-decoration: line-through; opacity: 0.35; }
\`;

interface TodoData {
  todos: Todo[];
  filter: "all" | "active" | "done";
  nextId: number;
}

@component("todo-list")
@styles(sheet)
class TodoList extends LoomElement {
  @store<TodoData>({ todos: [], filter: "all", nextId: 0 }, {
    key: "loom-example-todos",
    storage: new LocalAdapter(),
  })
  data!: TodoData;

  @query("input[type=text]") input!: HTMLInputElement;

  @computed get filtered(): Todo[] {
    const { todos, filter } = this.data;
    if (filter === "active") return todos.filter(t => !t.done);
    if (filter === "done")   return todos.filter(t => t.done);
    return todos;
  }

  add() {
    const text = this.input.value.trim();
    if (!text) return;
    this.data.todos = [...this.data.todos, { id: this.data.nextId++, text, done: false }];
    this.input.value = "";
  }

  toggle(id: number) {
    this.data.todos = this.data.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  }

  update() {
    const remaining = this.data.todos.filter(t => !t.done).length;
    return (
      <div>
        <div class="todo-input">
          <input type="text" placeholder="What needs to be done?"
                 onkeydown={e => e.key === "Enter" && this.add()} />
          <button class="add-btn" onClick={() => this.add()}>
            <loom-icon name="plus" size={14} color="#fff" /> Add
          </button>
        </div>
        {this.filtered.map(t => (
          <div class={"todo-item" + (t.done ? " done" : "")}>
            <div class="check" onClick={() => this.toggle(t.id)}>
              <loom-icon name="check" size={12} color="#fff" />
            </div>
            <span class="text">{t.text}</span>
            <button class="del" onClick={() => this.deleteTodo(t.id)}>
              <loom-icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  }
}`;
