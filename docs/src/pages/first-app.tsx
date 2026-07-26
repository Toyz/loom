/**
 * Your First App — /guides/your-first-app
 *
 * A todo list in four files. Every API used here was checked against src/:
 * CollectionStore's constructor is (initial, PersistOptions), a Reactive is
 * read through `.value` — which is the call that registers the dependency —
 * and LocalAdapter takes no arguments.
 *
 * One <doc-section> per step, so the right rail doubles as the step list.
 * The page previously taught two out-of-date idioms: building the stylesheet
 * inside update(), and mirroring the store into a local @reactive via @watch.
 */
import { LoomElement } from "@toyz/loom";

const STORE = `import { CollectionStore, LocalAdapter } from "@toyz/loom/store";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

// The second argument is what makes it persistent. Drop it: in-memory store.
export const todos = new CollectionStore<Todo>([], {
  key: "app:todos",
  storage: new LocalAdapter(),
});`;

const SHEET = `import { css } from "@toyz/loom";

// Module scope, not inside update(): built and parsed once for the whole app
// rather than on every render.
export const sheet = css\`
  :host { display: block; max-width: 480px; margin: 48px auto; }
  h1 { font-size: 1.5rem; margin-bottom: 16px; }

  .row { display: flex; gap: 8px; margin-bottom: 20px; }
  input {
    flex: 1; padding: 10px 14px;
    background: #14140f; color: #e6e1d3;
    border: 1px solid #33322a; outline: none;
  }
  input:focus { border-color: #c4472f; }
  button {
    padding: 10px 18px; border: none;
    background: #c4472f; color: #f5f1e6;
    font-weight: 600; cursor: pointer;
  }

  .todo {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; border-bottom: 1px solid #33322a;
  }
  .todo:last-child { border-bottom: none; }
  .done .label { text-decoration: line-through; opacity: 0.45; }
  .label { flex: 1; cursor: pointer; }
  .del { background: none; border: none; color: #6d6858; cursor: pointer; }
  .empty { color: #6d6858; font-style: italic; padding: 24px 0; text-align: center; }
\`;`;

const COMPONENT = `import { LoomElement, component, reactive, styles } from "@toyz/loom";
import { todos } from "./store";
import { sheet } from "./sheet";

@component("todo-app")
@styles(sheet)
export class TodoApp extends LoomElement {
  @reactive accessor input = "";

  add() {
    const text = this.input.trim();
    if (!text) return;
    todos.add({ text, done: false });
    this.input = "";
  }

  toggle(id: string) {
    const t = todos.find(id);
    if (t) todos.update(id, { done: !t.done });
  }

  update() {
    // Reading .value here IS the subscription. The trace records it, so a
    // change to the store re-renders this component and nothing else.
    const items = todos.value;

    return (
      <div>
        <h1>Todo</h1>
        <div class="row">
          <input
            value={this.input}
            onInput={(e) => (this.input = (e.target as HTMLInputElement).value)}
            onKeydown={(e) => e.key === "Enter" && this.add()}
            placeholder="What needs doing?"
          />
          <button onClick={() => this.add()}>Add</button>
        </div>

        {items.length === 0
          ? <div class="empty">Nothing yet.</div>
          : items.map((t) => (
              <div class={\`todo \${t.done ? "done" : ""}\`} loom-key={t.id}>
                <span class="label" onClick={() => this.toggle(t.id)}>{t.text}</span>
                <button class="del" onClick={() => todos.remove(t.id)}>x</button>
              </div>
            ))}
      </div>
    );
  }
}`;

const MAIN = `import { app } from "@toyz/loom";
import "./todo-app"; // side effect: registers <todo-app>

app.start();`;

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Loom Todo</title>
    <style>
      body { margin: 0; background: #100f0b; color: #e6e1d3;
             font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <todo-app></todo-app>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`;

export default class PageFirstApp extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Your First App"
          subtitle="A todo list that survives a reload, in four files and no state-management library."
        ></doc-header>

        <section>
          <p>A todo list is the standard first app because it exercises the parts that are genuinely awkward: a list that changes shape, an item edited in place, and state that has to outlive the page. Four files here, and every idea a real app needs.</p>
          <p>The thing worth watching is what is <em>absent</em>. No subscribe call, no unsubscribe, no local copy of the list kept in step with the store, and no re-render you have to ask for. Reading the store during a render is what registers the dependency, and that is the entire mechanism.</p>
          <punch-matrix
            columns="SURVIVES RELOAD,SHARED BETWEEN COMPONENTS,NEEDS TEARDOWN,RE-RENDERS AUTOMATICALLY"
            rows={[
              { name: "local @reactive", punches: "RE-RENDERS AUTOMATICALLY", note: "Right for the input box" },
              { name: "CollectionStore", punches: "SHARED BETWEEN COMPONENTS,RE-RENDERS AUTOMATICALLY", note: "One list, many readers" },
              { name: "+ LocalAdapter", punches: "SURVIVES RELOAD,SHARED BETWEEN COMPONENTS,RE-RENDERS AUTOMATICALLY", note: "What this app uses" },
            ]}
          ></punch-matrix>
          <p class="note">
            The teardown column is empty on purpose. A subscription is owned by the render that
            made it and released with the component, so there is nothing here to clean up.
          </p>
        </section>

        <doc-section heading="Step 1 — The store">
          <div class="step-num">src/store.ts</div>
          <p>
            <span class="ic">CollectionStore</span> is a <span class="ic">Reactive&lt;T[]&gt;</span> with the four list
            operations already on it. The second constructor argument is what makes it
            persistent; leave it out and everything below still works, just not across a reload.
          </p>
          <code-block lang="ts" code={STORE}></code-block>
          <doc-notification type="note">
            <span class="ic">add()</span> generates an <span class="ic">id</span> when you do not supply one, which is
            why the interface requires the field but the call site does not pass it. That id is
            what <span class="ic">loom-key</span> uses later to keep list reordering cheap.
          </doc-notification>
        </doc-section>

        <doc-section heading="Step 2 — The stylesheet">
          <div class="step-num">src/sheet.ts</div>
          <p>
            Styles live at module scope so the sheet is parsed once and shared by every instance.
            Building it inside <span class="ic">update()</span> rebuilds it on every render, which is the most
            common performance mistake in a first Loom app.
          </p>
          <code-block lang="ts" code={SHEET}></code-block>
        </doc-section>

        <doc-section heading="Step 3 — The component">
          <div class="step-num">src/todo-app.tsx</div>
          <p>
            One reactive field, for the text being typed. The list is not mirrored into the
            component at all — it is read from the store during the render.
          </p>
          <code-block lang="tsx" code={COMPONENT}></code-block>

          <h3>Why there is no subscribe call</h3>
          <p>
            Reading <span class="ic">todos.value</span> inside <span class="ic">update()</span> records the store as a
            dependency of that render. When it changes, Loom re-renders exactly the components
            that read it. Keeping a local copy in sync by hand is the bug this design removes,
            not a feature it is missing.
          </p>

          <h3>peek() is the one to be careful with</h3>
          <p class="caution">
            <span class="ic">todos.peek()</span> reads the same value <em>without</em> recording the dependency. That
            is what you want inside an event handler, and exactly what you do not want inside
            <span class="ic"> update()</span> — a component that reads with peek renders once and then never again.
          </p>
        </doc-section>

        <doc-section heading="Step 4 — Boot and markup">
          <div class="step-num">src/main.ts and index.html</div>
          <p>
            Importing the component module is what registers the element. Nothing reads a value
            from that import, so it is easy to delete by accident and then wonder where the tag
            went.
          </p>
          <code-block lang="ts" code={MAIN}></code-block>
          <code-block lang="html" code={HTML}></code-block>
        </doc-section>

        <doc-section heading="Step 5 — Run it">
          <div class="step-num">npx vite</div>
          <code-block lang="bash" code={`npx vite`}></code-block>
          <div class="specimen">
            <span class="label">What you should see</span>
            <p>
              Add a few items, tick one off, then reload. The list comes back, because the store
              wrote every change through to storage as it happened — and nothing in the component
              knows that, or had to ask for it.
            </p>
          </div>
        </doc-section>

        <doc-section heading="What to change next">
          <p>
            Each of these is a small edit to the code above, and each lands you on a different
            part of the framework.
          </p>
          <table class="api-table">
            <thead>
              <tr>
                <th>Try</th>
                <th>Change</th>
                <th>Leads to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Per-tab instead of forever</td>
                <td><code>SessionAdapter</code> in place of <code>LocalAdapter</code></td>
                <td>Storage</td>
              </tr>
              <tr>
                <td>A second view of the same list</td>
                <td>Read <code>todos.value</code> in another component</td>
                <td>Store patterns</td>
              </tr>
              <tr>
                <td>A count that maintains itself</td>
                <td>A <code>@computed</code> getter over the list</td>
                <td>Reactive</td>
              </tr>
              <tr>
                <td>Filter as you type</td>
                <td><code>@debounce(200)</code> on the filter method</td>
                <td>Timing</td>
              </tr>
              <tr>
                <td>Ten thousand todos</td>
                <td>Render the list inside <code>&lt;loom-virtual&gt;</code></td>
                <td>Virtual List</td>
              </tr>
            </tbody>
          </table>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
