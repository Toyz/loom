import {
    LoomElement,
    component,
    prop,
    reactive,
    css,
    styles,
    inject,
    on,
} from "@toyz/loom";
import { type Todo, TodoStore, TodoChanged } from "../store";

const itemStyles = css`
  :host { display: block; }
  .todo-item {
    position: relative;
    font-size: 24px;
    border-bottom: 1px solid #ededed;
  }
  .todo-item.editing {
    border-bottom: none;
    padding: 0;
  }
  .todo-item.editing .view { display: none; }
  .todo-item.editing .edit { display: block; }
  .view {
    display: flex;
    align-items: center;
  }
  .toggle {
    text-align: center;
    width: 40px;
    height: auto;
    position: absolute;
    top: 0;
    bottom: 0;
    margin: auto 0;
    border: none;
    appearance: none;
    opacity: 0;
  }
  .toggle + label {
    background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23ededed%22%20stroke-width%3D%223%22/%3E%3C/svg%3E');
    background-repeat: no-repeat;
    background-position: center left;
  }
  .toggle:checked + label {
    background-image: url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%22-10%20-18%20100%20135%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2250%22%20fill%3D%22none%22%20stroke%3D%22%23bddad5%22%20stroke-width%3D%223%22/%3E%3Cpath%20fill%3D%22%235dc2af%22%20d%3D%22M72%2025L42%2071%2027%2056l-4%204%2020%2020%2034-52z%22/%3E%3C/svg%3E');
  }
  label {
    word-break: break-all;
    padding: 15px 15px 15px 60px;
    display: block;
    line-height: 1.2;
    transition: color 0.4s;
    font-weight: 400;
    color: #4d4d4d;
    flex: 1;
  }
  .completed label {
    color: #cdcdcd;
    text-decoration: line-through;
  }
  .destroy {
    display: none;
    position: absolute;
    top: 0;
    right: 10px;
    bottom: 0;
    width: 40px;
    height: 40px;
    margin: auto 0;
    font-size: 30px;
    color: #cc9a9a;
    transition: color 0.2s ease-out;
    border: none;
    background: none;
    cursor: pointer;
  }
  .todo-item:hover .destroy {
    display: block;
  }
  .destroy:hover {
    color: #af5b5e;
  }
  .edit {
    display: none;
    position: relative;
    margin: 0;
    width: 100%;
    font-size: 24px;
    font-family: inherit;
    font-weight: inherit;
    line-height: 1.4em;
    color: inherit;
    padding: 12px 16px;
    border: 1px solid #999;
    box-sizing: border-box;
    box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
  }
`;

@component("todo-item")
@styles(itemStyles)
export class TodoItem extends LoomElement {
    @inject(TodoStore) accessor store!: TodoStore;
    @prop accessor todo!: Todo;
    @reactive accessor editing = false;

    @on(TodoChanged)
    onTodoChanged(e: TodoChanged) {
        if (e.todo.id === this.todo.id) {
            this.todo = e.todo;
        }
    }

    startEditing() {
        this.editing = true;
        // Focus the edit input after render
        requestAnimationFrame(() => {
            const input = this.shadow.querySelector<HTMLInputElement>(".edit");
            if (input) {
                input.value = this.todo.text;
                input.focus();
            }
        });
    }

    commitEdit(input: HTMLInputElement) {
        const text = input.value.trim();
        if (text && text !== this.todo.text) {
            this.store.updateText(this.todo.id, text);
        } else if (!text) {
            this.store.destroy(this.todo.id);
        }
        this.editing = false;
    }

    handleEditKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            this.commitEdit(e.target as HTMLInputElement);
        } else if (e.key === "Escape") {
            this.editing = false;
        }
    }

    update() {
        const cls = [
            "todo-item",
            this.todo.completed ? "completed" : "",
            this.editing ? "editing" : "",
        ].filter(Boolean).join(" ");

        return (
            <div class={cls}>
                <div class="view">
                    <input
                        class="toggle"
                        type="checkbox"
                        checked={this.todo.completed}
                        onChange={() => this.store.toggle(this.todo.id)}
                    />
                    <label onDblClick={() => this.startEditing()}>
                        {this.todo.text}
                    </label>
                    <button class="destroy" onClick={() => this.store.destroy(this.todo.id)}>
                        ×
                    </button>
                </div>
                <input
                    class="edit"
                    value={this.todo.text}
                    onBlur={(e: any) => this.commitEdit(e.target)}
                    onKeyDown={(e: any) => this.handleEditKeyDown(e)}
                />
            </div>
        );
    }
}
