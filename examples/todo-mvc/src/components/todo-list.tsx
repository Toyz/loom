import { LoomElement, component, css, styles, inject, watch } from "@toyz/loom";
import { TodoStore } from "../store";
import "./todo-item"; // Register child component

const listStyles = css`
  :host { display: block; }
  .main {
    position: relative;
    z-index: 2;
    border-top: 1px solid #e6e6e6;
  }
  .toggle-all {
    width: 1px; height: 1px;
    border: none; opacity: 0;
    position: absolute; right: 100%; bottom: 100%;
  }
  .toggle-all + label {
    width: 60px; height: 34px;
    font-size: 0; position: absolute;
    top: -52px; left: -13px;
    transform: rotate(90deg);
  }
  .toggle-all + label:before {
    content: '❯'; font-size: 22px; color: #e6e6e6; padding: 10px 27px 10px 27px;
  }
  .toggle-all:checked + label:before { color: #737373; }
  .todo-list { margin: 0; padding: 0; list-style: none; }
`;

@component("todo-list")
@styles(listStyles)
export class TodoList extends LoomElement {
  @inject(TodoStore) accessor store!: TodoStore;

  @watch(TodoStore, "todos")
  onTodosChange() { }

  @watch(TodoStore, "filter")
  onFilterChange() { }

  update() {
    const visible = this.store.visibleTodos;
    const allCompleted = this.store.allCompleted;
    const total = this.store.todos.value.length;

    if (total === 0) return;

    return (
      <section class="main">
        <input
          id="toggle-all"
          class="toggle-all"
          type="checkbox"
          checked={allCompleted}
          onChange={(e: any) => this.store.toggleAll(e.target.checked)}
        />
        <label htmlFor="toggle-all">Mark all as complete</label>
        <ul class="todo-list">
          {visible.map((todo) => (
            <todo-item data-loom-key={todo.id} todo={todo}></todo-item>
          ))}
        </ul>
      </section>
    );
  }
}
