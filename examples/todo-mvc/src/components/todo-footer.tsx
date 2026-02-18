import { LoomElement, component, css, styles, inject, watch } from "@toyz/loom";
import { TodoStore } from "../store";

const footerStyles = css`
  :host { display: block; }
  .footer {
    color: #777;
    padding: 10px 15px;
    height: 20px;
    text-align: center;
    border-top: 1px solid #e6e6e6;
  }
  .footer:before {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 50px;
    overflow: hidden;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2), 0 8px 0 -3px #f6f6f6, 0 9px 1px -3px rgba(0, 0, 0, 0.2), 0 16px 0 -6px #f6f6f6, 0 17px 2px -6px rgba(0, 0, 0, 0.2);
  }
  .todo-count {
    float: left;
    text-align: left;
  }
  .todo-count strong { font-weight: 300; }
  .filters {
    margin: 0;
    padding: 0;
    list-style: none;
    position: absolute;
    right: 0;
    left: 0;
  }
  .filters li { display: inline; }
  .filters li a {
    color: inherit;
    margin: 3px;
    padding: 3px 7px;
    text-decoration: none;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
  }
  .filters li a:hover { border-color: rgba(175, 47, 47, 0.1); }
  .filters li a.selected { border-color: rgba(175, 47, 47, 0.2); }
  .clear-completed {
    float: right;
    position: relative;
    line-height: 20px;
    text-decoration: none;
    cursor: pointer;
  }
  .clear-completed:hover { text-decoration: underline; }
`;

@component("todo-footer")
@styles(footerStyles)
export class TodoFooter extends LoomElement {
  @inject(TodoStore) accessor store!: TodoStore;

  @watch(TodoStore, "todos")
  onTodosChange() { }

  @watch(TodoStore, "filter")
  onFilterChange() { }

  update() {
    const active = this.store.activeCount;
    const completed = this.store.completedCount;
    const filter = this.store.filter.value;
    const total = this.store.todos.value.length;

    if (total === 0) return;

    return (
      <footer class="footer">
        <span class="todo-count">
          <strong>{active}</strong> {active === 1 ? "item" : "items"} left
        </span>
        <ul class="filters">
          <li>
            <a href="#/"
              class={filter === "all" ? "selected" : ""}
              onClick={() => this.store.setFilter("all")}>All</a>
          </li>
          <li>
            <a href="#/active"
              class={filter === "active" ? "selected" : ""}
              onClick={() => this.store.setFilter("active")}>Active</a>
          </li>
          <li>
            <a href="#/completed"
              class={filter === "completed" ? "selected" : ""}
              onClick={() => this.store.setFilter("completed")}>Completed</a>
          </li>
        </ul>
        {completed > 0 && (
          <button class="clear-completed" onClick={() => this.store.clearCompleted()}>
            Clear completed
          </button>
        )}
      </footer>
    );
  }
}
