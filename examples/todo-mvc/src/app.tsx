import { LoomElement, component, mount, css, styles, inject } from "@toyz/loom";
import { RouteChanged } from "@toyz/loom/router";
import { TodoStore, type FilterType } from "./store";
import "./components/todo-input";
import "./components/todo-list";
import "./components/todo-footer";

const appStyles = css`
  :host {
    display: block;
    max-width: 550px;
    margin: 0 auto;
    padding-top: 80px;
  }
  h1 {
    font-size: 80px;
    font-weight: 200;
    line-height: 1;
    text-align: center;
    color: rgba(175, 47, 47, 0.3);
    text-rendering: optimizeLegibility;
    margin: 0 0 20px 0;
    padding: 0;
  }
  .todoapp {
    background: #fff;
    margin: 0 0 40px 0;
    position: relative;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2),
                0 25px 50px 0 rgba(0, 0, 0, 0.1);
  }
  .info {
    margin: 65px auto 0;
    color: #bfbfbf;
    font-size: 10px;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
    text-align: center;
  }
  .info p { line-height: 1; }
  .info a { color: inherit; text-decoration: none; font-weight: 400; }
  .info a:hover { text-decoration: underline; }
`;


@component("todo-mvc-app")
@styles(appStyles)
export class TodoMvcApp extends LoomElement {
    @inject(TodoStore) accessor store!: TodoStore;

    @mount
    setup() {
        // Listen for route changes to update the store filter
        this.on(RouteChanged, (e) => {
            const hash = e.path.replace("/", "");
            let filter: FilterType = "all";
            if (hash === "active") filter = "active";
            if (hash === "completed") filter = "completed";

            this.store.setFilter(filter);
        });
    }

    update() {
        return (
            <div>
                <h1>todos</h1>
                <section class="todoapp">
                    <todo-input></todo-input>
                    <todo-list></todo-list>
                    <todo-footer></todo-footer>
                </section>
                <footer class="info">
                    <p>Double-click to edit a todo</p>
                    <p>Created with <a href="https://github.com/Toyz/loom">Loom</a></p>
                    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
                </footer>
            </div>
        );
    }
}
