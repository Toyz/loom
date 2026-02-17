/**
 * Todo List — A reactive todo with add, toggle, delete, and filter.
 *
 * Demonstrates: @component, @store, @computed, @query, @styles, css, loom-icon
 */
import { LoomElement, component, computed, query, css, styles, store, LocalAdapter } from "@toyz/loom";

interface Todo { id: number; text: string; done: boolean; }

const local = new LocalAdapter();

const sheet = css`
  :host { display: block; }

  /* ── Input row ── */
  .todo-input {
    display: flex; gap: 0.5rem; margin-bottom: 1.25rem;
  }
  .todo-input input {
    flex: 1; padding: 0.75rem 1rem;
    border: 1px solid var(--border, #333); border-radius: 8px;
    background: var(--surface-2, #1e1e2e); color: var(--text, #e0e0e0);
    font-size: 0.95rem; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .todo-input input::placeholder { color: var(--text-muted, #666); }
  .todo-input input:focus {
    border-color: var(--accent, #a78bfa);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15);
  }
  .add-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.65rem 1.25rem; border: none; border-radius: 8px;
    background: var(--accent, #a78bfa); color: #fff;
    font-weight: 600; font-size: 0.9rem;
    cursor: pointer; transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .add-btn:hover { opacity: 0.9; }
  .add-btn:active { transform: scale(0.97); }

  /* ── Filter pills ── */
  .filters {
    display: flex; gap: 0.35rem; margin-bottom: 1.25rem;
  }
  .filters button {
    padding: 0.35rem 0.85rem; border: 1px solid var(--border, #333);
    border-radius: 999px; background: transparent;
    color: var(--text-muted, #888); font-size: 0.8rem;
    cursor: pointer; transition: all 0.15s;
  }
  .filters button:hover {
    border-color: var(--accent, #a78bfa);
    color: var(--text, #e0e0e0);
  }
  .filters button.active {
    background: var(--accent, #a78bfa); color: #fff;
    border-color: var(--accent, #a78bfa);
  }

  /* ── Todo items ── */
  .todo-item {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem 0.85rem; margin-bottom: 0.35rem;
    border-radius: 8px; background: var(--surface-2, #1e1e2e);
    border: 1px solid var(--border, #333);
    transition: border-color 0.15s, background 0.15s;
  }
  .todo-item:hover {
    border-color: var(--accent, #a78bfa);
    background: rgba(167, 139, 250, 0.04);
  }

  /* ── Custom checkbox ── */
  .check {
    width: 20px; height: 20px; flex-shrink: 0;
    border: 2px solid var(--border, #444); border-radius: 6px;
    cursor: pointer; display: grid; place-items: center;
    transition: background 0.15s, border-color 0.15s;
    background: transparent;
  }
  .todo-item.done .check {
    background: var(--accent, #a78bfa);
    border-color: var(--accent, #a78bfa);
  }
  .check loom-icon { opacity: 0; transition: opacity 0.15s; }
  .todo-item.done .check loom-icon { opacity: 1; }

  /* ── Text ── */
  .text {
    flex: 1; cursor: pointer;
    font-size: 0.95rem; line-height: 1.4;
    transition: opacity 0.15s;
  }
  .todo-item.done .text {
    text-decoration: line-through;
    opacity: 0.35;
  }

  /* ── Delete button ── */
  .del {
    opacity: 0; width: 28px; height: 28px;
    border: none; border-radius: 6px; cursor: pointer;
    background: transparent; color: var(--text-muted, #888);
    display: grid; place-items: center;
    transition: opacity 0.15s, color 0.15s, background 0.15s;
  }
  .todo-item:hover .del { opacity: 1; }
  .del:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }

  /* ── Footer ── */
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 0.75rem; padding-top: 0.75rem;
    border-top: 1px solid var(--border, #333);
  }
  .count {
    color: var(--text-muted, #888); font-size: 0.8rem;
  }
  .clear-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.3rem 0.7rem; border: none; border-radius: 6px;
    background: transparent; color: var(--text-muted, #888);
    font-size: 0.8rem; cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .clear-btn:hover {
    color: #ef4444; background: rgba(239, 68, 68, 0.08);
  }

  /* ── Empty state ── */
  .empty {
    text-align: center; padding: 2rem 1rem;
    color: var(--text-muted, #666);
  }
  .empty loom-icon { opacity: 0.4; margin-bottom: 0.5rem; }
  .empty-text { font-size: 0.9rem; font-style: italic; }
`;

interface TodoData {
  todos: Todo[];
  filter: "all" | "active" | "done";
  nextId: number;
}

@component("todo-list")
@styles(sheet)
export class TodoList extends LoomElement {
  @store<TodoData>({ todos: [], filter: "all", nextId: 0 }, {
    key: "loom-example-todos",
    storage: local,
  })
  accessor data!: TodoData;

  @query("input[type=text]") accessor input!: HTMLInputElement;

  @computed
  get filtered(): Todo[] {
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
    this.input.focus();
  }

  toggle(id: number) {
    this.data.todos = this.data.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
  }

  deleteTodo(id: number) {
    this.data.todos = this.data.todos.filter(t => t.id !== id);
  }

  setFilter(f: "all" | "active" | "done") {
    this.data.filter = f;
  }

  clearDone() {
    this.data.todos = this.data.todos.filter(t => !t.done);
  }

  update() {
    const remaining = this.data.todos.filter(t => !t.done).length;
    const doneCount = this.data.todos.length - remaining;
    return (
      <div>
        <div class="todo-input">
          <input type="text" placeholder="What needs to be done?"
                 onkeydown={(e: KeyboardEvent) => e.key === "Enter" && this.add()} />
          <button class="add-btn" onClick={() => this.add()}>
            <loom-icon name="plus" size={14} color="#fff"></loom-icon>
            Add
          </button>
        </div>

        <div class="filters">
          {(["all", "active", "done"] as const).map(f => (
            <button class={this.data.filter === f ? "active" : ""}
                    onClick={() => this.setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {this.filtered.length === 0
          ? <div class="empty">
              <loom-icon name="clipboard-list" size={36} color="var(--text-muted)"></loom-icon>
              <div class="empty-text">
                {this.data.todos.length === 0
                  ? "Nothing here yet — add a todo above."
                  : `No ${this.data.filter} items.`}
              </div>
            </div>
          : this.filtered.map(t => (
              <div class={"todo-item" + (t.done ? " done" : "")}>
                <div class="check" onClick={() => this.toggle(t.id)}>
                  <loom-icon name="check" size={12} color="#fff"></loom-icon>
                </div>
                <span class="text" onClick={() => this.toggle(t.id)}>{t.text}</span>
                <button class="del" onClick={() => this.deleteTodo(t.id)} title="Delete">
                  <loom-icon name="x" size={14}></loom-icon>
                </button>
              </div>
            ))
        }

        {this.data.todos.length > 0 && (
          <div class="footer">
            <span class="count">{remaining} item{remaining !== 1 ? "s" : ""} left</span>
            {doneCount > 0 && (
              <button class="clear-btn" onClick={() => this.clearDone()}>
                <loom-icon name="trash-2" size={12}></loom-icon>
                Clear done ({doneCount})
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
}
