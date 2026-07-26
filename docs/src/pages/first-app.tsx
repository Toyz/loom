/**
 * Your First App — /guides/your-first-app
 *
 * End-to-end walkthrough building a todo app.
 */
import { LoomElement, css, styles as applyStyles } from "@toyz/loom";
import { inlineLink } from "../styles/doc-page";

const styles = css`
  /* ── Custom list bullets ── */
  ul { list-style: none; padding: 0; margin-bottom: var(--space-4); }
  li {
    position: relative; padding-left: var(--space-5);
    color: var(--text-secondary); margin-bottom: var(--space-2);
    line-height: var(--leading-normal);
  }
  li::before {
    content: ""; position: absolute; left: 0; top: 10px;
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent);
  }

  /* ── File tree ── */
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
  .file-tree .dir  { color: var(--accent); }
  .file-tree .file { color: var(--text-muted); }
  .file-tree .hl   { color: var(--emerald); font-weight: 600; }

  /* ── Concepts grid ── */
  .concepts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }
  .concept-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    text-align: center;
  }
  .concept-card .name {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--accent);
    font-weight: 600;
  }
  .concept-card .desc {
    font-size: var(--text-xs);
    color: var(--text-muted);
    margin-top: var(--space-1);
    line-height: 1.5;
  }

  /* ── Step numbers ── */
  .step { margin-bottom: var(--space-10); }
  .step-header {
    display: flex; align-items: center;
    gap: var(--space-3); margin-bottom: var(--space-4);
  }
  .step-num {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--accent-glow); border: 1px solid var(--accent-dim);
    display: flex; align-items: center; justify-content: center;
    font-size: var(--text-xs); font-weight: 700;
    font-family: var(--font-mono); color: var(--accent);
    flex-shrink: 0;
  }

  /* ── Callouts ── */
  .result-card {
    background: var(--ground-sunk);
    border: 1px solid var(--warp-lit);
    border-radius: 0;
    clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    padding: var(--space-6);
    text-align: center;
    margin-top: var(--space-4);
  }
  .result-card h3 {
    color: var(--emerald); margin: 0 0 var(--space-2);
    font-size: var(--text-lg);
  }
  .result-card p {
    color: var(--text-muted); font-size: var(--text-sm); margin: 0;
  }
`;

@applyStyles(styles)
export default class PageFirstApp extends LoomElement {

  update() {
    return (
      <div>
        <doc-header title="Your First App" subtitle="Build a persistent todo list in 4 files. No CLI, no build config — just Vite + Loom."></doc-header>

        {/* ─── What You'll Learn ─── */}

        <section>
          <h2>Concepts Used</h2>
          <div class="concepts">
            <div class="concept-card">
              <div class="name">@component</div>
              <div class="desc">Define a custom element</div>
            </div>
            <div class="concept-card">
              <div class="name">@reactive</div>
              <div class="desc">Auto re-render on change</div>
            </div>
            <div class="concept-card">
              <div class="name">CollectionStore</div>
              <div class="desc">CRUD for lists of items</div>
            </div>
            <div class="concept-card">
              <div class="name">LocalAdapter</div>
              <div class="desc">Persist to localStorage</div>
            </div>
            <div class="concept-card">
              <div class="name">@watch</div>
              <div class="desc">React to store changes</div>
            </div>
            <div class="concept-card">
              <div class="name">loom-key</div>
              <div class="desc">Keyed DOM diffing</div>
            </div>
          </div>
        </section>

        {/* ─── Project Structure ─── */}

        <section>
          <h2>Project Structure</h2>
          <div class="file-tree">
            <div><span class="dir">my-todo/</span></div>
            <div>  ├─ <span class="file">index.html</span></div>
            <div>  ├─ <span class="hl">src/store.ts</span>    — the data model</div>
            <div>  ├─ <span class="hl">src/todo-app.tsx</span> — the component</div>
            <div>  └─ <span class="hl">src/main.ts</span>    — entry point</div>
          </div>
        </section>

        {/* ─── Step 1 ─── */}

        <div class="step">
          <div class="step-header">
            <div class="step-num">1</div>
            <h2>Define the Store</h2>
          </div>
          <p>Create <span class="ic">src/store.ts</span>  — a typed collection with automatic localStorage persistence:</p>
          <code-block lang="ts" code={`import { CollectionStore, LocalAdapter } from "@toyz/loom/store";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export const todos = new CollectionStore<Todo>([], {
  key: "app:todos",
  storage: new LocalAdapter(),
});`}></code-block>
          <doc-notification type="note">
            <div>
              <strong>CollectionStore</strong> extends <span class="ic">Reactive&lt;T[]&gt;</span> with
              <span class="ic">.add()</span>, <span class="ic">.remove()</span>,
              <span class="ic">.update()</span>, and <span class="ic">.find()</span>.
              The <span class="ic">LocalAdapter</span> persists every change to
              <span class="ic">localStorage</span> automatically.
            </div>
          </doc-notification>
        </div>

        {/* ─── Step 2 ─── */}

        <div class="step">
          <div class="step-header">
            <div class="step-num">2</div>
            <h2>Build the Component</h2>
          </div>
          <p>Create <span class="ic">src/todo-app.tsx</span>:</p>
          <code-block lang="ts" code={`import { LoomElement, component, reactive, css, styles } from "@toyz/loom";
import { todos } from "./store";

// Built and parsed once for the whole app, not once per render.
const sheet = css\`
  :host { display: block; max-width: 480px; margin: 48px auto; font-family: system-ui; }
  h1    { font-size: 1.5rem; margin-bottom: 16px; font-weight: 700; }
  .row  { display: flex; gap: 8px; margin-bottom: 20px; }
  input {
    flex: 1; padding: 10px 14px;
    border: 1px solid #33322a; border-radius: 8px;
    background: #14140f; color: #e6e1d3;
    font-size: 14px; outline: none;
  }
  input:focus { border-color: #c4472f; }
  button {
    padding: 10px 18px; border-radius: 8px; border: none;
    background: #c4472f; color: #f5f1e6;
    cursor: pointer; font-weight: 600; font-size: 14px;
  }
  .todo {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 0; border-bottom: 1px solid #33322a;
  }
  .todo:last-child { border-bottom: none; }
  .done .label { text-decoration: line-through; opacity: 0.45; }
  .label { flex: 1; cursor: pointer; }
  .del { background: none; border: none; color: #6d6858; cursor: pointer; font-size: 18px; }
  .empty { color: #6d6858; font-style: italic; padding: 24px 0; text-align: center; }
\`;

@component("todo-app")
@styles(sheet)
export class TodoApp extends LoomElement {
  @reactive accessor input = "";

  add() {
    if (!this.input.trim()) return;
    todos.add({ text: this.input, done: false });
    this.input = "";
  }

  toggle(id: string) {
    const t = todos.find(id);
    if (t) todos.update(id, { done: !t.done });
  }

  remove(id: string) {
    todos.remove(id);
  }

  update() {
    // Reading the store here is the subscription: the trace records it,
    // so any change re-renders this component and nothing else.
    const items = todos.value;

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
        {items.length === 0
          ? <div class="empty">No todos yet — add one above!</div>
          : items.map(t => (
              <div
                class={\`todo \${t.done ? "done" : ""}\`}
                loom-key={t.id}
              >
                <span class="label" onClick={() => this.toggle(t.id)}>
                  {t.done ? "[x] " : "[ ] "}{t.text}
                </span>
                <button class="del" onClick={() => this.remove(t.id)}>×</button>
              </div>
            ))
        }
      </div>
    );
  }
}`}></code-block>
          <doc-notification type="note">
            <div>
              Nothing subscribes to the store. Reading <span class="ic">todos.value</span> inside
              <span class="ic">update()</span> <em>is</em> the subscription — the trace records
              which reactives a render read, so a change re-renders exactly the components that
              read it and nothing else. There is no teardown to write, and no local copy of the
              list to keep in step.
            </div>
          </doc-notification>
        </div>

        {/* ─── Step 3 ─── */}

        <div class="step">
          <div class="step-header">
            <div class="step-num">3</div>
            <h2>Wire Up main.ts</h2>
          </div>
          <p>Create <span class="ic">src/main.ts</span>:</p>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import "./todo-app"; // side-effect: registers <todo-app>

app.start();`}></code-block>
          <p>
            Importing the component file triggers the <span class="ic">@component</span> decorator, which calls
            <span class="ic">customElements.define()</span>. Then <span class="ic">app.start()</span> boots the
            service container.
          </p>
        </div>

        {/* ─── Step 4 ─── */}

        <div class="step">
          <div class="step-header">
            <div class="step-num">4</div>
            <h2>Add the HTML</h2>
          </div>
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
        </div>

        {/* ─── Step 5 ─── */}

        <div class="step">
          <div class="step-header">
            <div class="step-num">5</div>
            <h2>Run It</h2>
          </div>
          <code-block lang="bash" code={`npx vite`}></code-block>
          <div class="result-card">
            <h3 style="display: flex; align-items: center; justify-content: center; gap: 8px;"><loom-icon name="check-circle" size="20"></loom-icon>You're Live</h3>
            <p>
              Open <span class="ic">http://localhost:5173</span> — add some items, refresh, and they'll persist.
            </p>
          </div>
        </div>

        {/* ─── Key Takeaways ─── */}

        <section>
          <h2>Key Takeaways</h2>
          <ul>
            <li><span class="ic">@reactive</span> triggers re-renders when properties change</li>
            <li><span class="ic">@watch(store)</span> auto-subscribes to stores — no manual cleanup needed</li>
            <li><span class="ic">loom-key</span> enables efficient keyed DOM reconciliation</li>
            <li>Persistence is a single constructor option — swap <span class="ic">LocalAdapter</span> for <span class="ic">SessionAdapter</span> or your own backend</li>
            <li>No build config beyond <span class="ic">tsconfig.json</span> — see <loom-link to="/guides/getting-started" styles={[inlineLink]} style="color: var(--accent)">Getting Started</loom-link></li>
          </ul>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
