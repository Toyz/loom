/**
 * Your First App — /guides/your-first-app
 *
 * End-to-end walkthrough building a todo app.
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/guides/your-first-app")
@component("page-first-app")
export class PageFirstApp extends LoomElement {
  update() {
    this.css`
      ul {
        list-style: none;
        padding: 0;
        margin-bottom: var(--space-4);
      }

      li {
        position: relative;
        padding-left: var(--space-5);
        color: var(--text-secondary);
        margin-bottom: var(--space-2);
        line-height: var(--leading-normal);
      }
      li::before {
        content: "";
        position: absolute;
        left: 0;
        top: 10px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
      }

      .file-tree {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: var(--space-4) var(--space-5);
        font-family: var(--font-mono);
        font-size: var(--text-sm);
        line-height: 1.8;
        margin-bottom: var(--space-4);
        color: var(--text-secondary);
      }
      .file-tree .dir { color: var(--accent); }
      .file-tree .file { color: var(--text-muted); }
      .file-tree .highlight { color: var(--emerald); font-weight: 600; }
    `;

    return (
      <div>
        <h1>Your First App</h1>
        <p class="subtitle">Build a persistent todo list using Loom's core primitives.</p>

        <section>
          <h2>What We're Building</h2>
          <p>A todo app that demonstrates:</p>
          <ul>
            <li><span class="ic">@component</span> and <span class="ic">@reactive</span> for UI state</li>
            <li><span class="ic">CollectionStore</span> for CRUD operations</li>
            <li><span class="ic">LocalMedium</span> for persistence across reloads</li>
            <li><span class="ic">@mount</span> for lifecycle-managed subscriptions</li>
          </ul>
        </section>

        <section>
          <h2>Project Structure</h2>
          <p>We'll create three files:</p>
          <div class="file-tree">
            <div><span class="dir">my-todo/</span></div>
            <div>  ├─ <span class="file">index.html</span></div>
            <div>  ├─ <span class="highlight">src/store.ts</span>  — the data model</div>
            <div>  ├─ <span class="highlight">src/todo-app.tsx</span> — the component</div>
            <div>  └─ <span class="highlight">src/main.ts</span>  — entry point</div>
          </div>
        </section>

        <section>
          <h2>1 — Define the Store</h2>
          <p>Create <span class="ic">src/store.ts</span>:</p>
          <code-block lang="ts" code={`import { CollectionStore, LocalMedium } from "@toyz/loom";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export const todos = new CollectionStore<Todo>([], {
  key: "app:todos",
  storage: new LocalMedium(),
});`}></code-block>
          <p>
            <span class="ic">CollectionStore</span> wraps <span class="ic">Reactive&lt;T[]&gt;</span> with
            <span class="ic">.add()</span>, <span class="ic">.remove()</span>,
            and <span class="ic">.update()</span>. Passing a <span class="ic">LocalMedium</span> auto-persists
            every change to <span class="ic">localStorage</span>.
          </p>
        </section>

        <section>
          <h2>2 — Build the Component</h2>
          <p>Create <span class="ic">src/todo-app.tsx</span>:</p>
          <code-block lang="ts" code={`import { LoomElement, component, reactive, mount } from "@toyz/loom";
import { todos } from "./store";

@component("todo-app")
export class TodoApp extends LoomElement {
  @reactive input = "";

  @mount
  subscribe() {
    // Re-render whenever the store changes
    const unsub = todos.subscribe(() => this.scheduleUpdate());
    return unsub; // returned cleanup runs on unmount
  }

  add() {
    if (!this.input.trim()) return;
    todos.add({ text: this.input, done: false });
    this.input = "";
  }

  toggle(id: string) {
    const todo = todos.find(id);
    if (todo) todos.update(id, { done: !todo.done });
  }

  update() {
    this.css\`
      :host { display: block; max-width: 480px; margin: 40px auto; font-family: system-ui; }
      h1 { font-size: 1.5rem; margin-bottom: 16px; }
      .row { display: flex; gap: 8px; margin-bottom: 16px; }
      input { flex: 1; padding: 8px 12px; border: 1px solid #333; border-radius: 6px;
              background: #111; color: #eee; font-size: 14px; }
      button { padding: 8px 16px; border-radius: 6px; border: none;
               background: #818cf8; color: #fff; cursor: pointer; font-weight: 600; }
      button:hover { background: #6366f1; }
      .todo { padding: 10px 0; cursor: pointer; border-bottom: 1px solid #1e1e2a; }
      .done { text-decoration: line-through; opacity: 0.5; }
      .empty { color: #666; font-style: italic; padding: 20px 0; }
    \`;

    return (
      <div>
        <h1>Todo</h1>
        <div class="row">
          <input
            value={this.input}
            onInput={(e) => this.input = e.target.value}
            onKeydown={(e) => e.key === "Enter" && this.add()}
            placeholder="What needs doing?"
          />
          <button onClick={() => this.add()}>Add</button>
        </div>
        {todos.value.length === 0
          ? <div class="empty">No todos yet — add one above!</div>
          : todos.value.map(t => (
              <div
                class={\`todo \${t.done ? "done" : ""}\`}
                data-loom-key={t.id}
                onClick={() => this.toggle(t.id)}
              >
                {t.done ? "✓ " : "○ "}{t.text}
              </div>
            ))
        }
      </div>
    );
  }
}`}></code-block>
        </section>

        <section>
          <h2>3 — Wire Up the Entry Point</h2>
          <p>Create <span class="ic">src/main.ts</span>:</p>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import "./todo-app"; // side-effect: registers <todo-app>

app.start();`}></code-block>
          <p>
            Importing the component file triggers the <span class="ic">@component</span> decorator, which calls
            <span class="ic">customElements.define()</span>. Then <span class="ic">app.start()</span> boots the
            service container and fires any registered providers.
          </p>
        </section>

        <section>
          <h2>4 — Add the HTML</h2>
          <p>Create <span class="ic">index.html</span>:</p>
          <code-block lang="html" code={`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loom Todo</title>
    <style>
      body { margin: 0; background: #0a0a12; color: #e8e8f0; }
    </style>
  </head>
  <body>
    <todo-app></todo-app>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`}></code-block>
        </section>

        <section>
          <h2>5 — Run It</h2>
          <code-block lang="bash" code={`npx vite`}></code-block>
          <p>
            Open <span class="ic">http://localhost:5173</span> — you should see the todo app.
            Add some items, refresh the page, and they'll still be there thanks to <span class="ic">LocalMedium</span>.
          </p>
        </section>

        <section>
          <h2>Key Takeaways</h2>
          <ul>
            <li><span class="ic">@reactive</span> triggers re-renders when properties change</li>
            <li><span class="ic">@mount</span> sets up subscriptions — return a cleanup function and it runs on disconnect</li>
            <li><span class="ic">data-loom-key</span> enables efficient keyed DOM reconciliation</li>
            <li>Persistence is a single constructor option — swap <span class="ic">LocalMedium</span> for <span class="ic">SessionMedium</span> or your own backend</li>
            <li>No build config needed beyond <span class="ic">tsconfig.json</span> (see Getting Started)</li>
          </ul>
        </section>
      </div>
    );
  }
}
