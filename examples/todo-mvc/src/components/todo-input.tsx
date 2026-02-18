import { LoomElement, component, css, styles, query, inject } from "@toyz/loom";
import { TodoStore } from "../store";

const inputStyles = css`
  :host { display: block; }
  .new-todo {
    padding: 16px 16px 16px 60px;
    border: none;
    background: rgba(0, 0, 0, 0.003);
    box-shadow: inset 0 -2px 1px rgba(0,0,0,0.03);
    position: relative;
    margin: 0;
    width: 100%;
    font-size: 24px;
    font-family: inherit;
    font-weight: inherit;
    line-height: 1.4em;
    color: inherit;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .new-todo:focus {
    box-shadow: 0 0 2px 2px #cf7d7d;
    outline: 0;
  }
  ::placeholder {
    font-style: italic;
    font-weight: 300;
    color: #e6e6e6;
  }
`;

@component("todo-input")
@styles(inputStyles)
export class TodoInput extends LoomElement {
    @inject(TodoStore) accessor store!: TodoStore;
    @query("input") accessor input!: HTMLInputElement;

    handleKeyDown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            const val = this.input.value.trim();
            if (val) {
                this.store.add(val);
                this.input.value = "";
            }
        }
    }

    update() {
        return (
            <header class="header">
                <input
                    class="new-todo"
                    placeholder="What needs to be done?"
                    autofocus
                    onKeyDown={(e) => this.handleKeyDown(e)}
                />
            </header>
        );
    }
}
