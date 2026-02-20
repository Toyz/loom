/**
 * Store — @store decorator  /store/store-decorator
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreDecorator extends LoomElement {
  update() {
    return (
      <div>
        <h1>@store Decorator</h1>
        <p class="subtitle">Component-scoped reactive stores with optional persistence.</p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">@store</span> decorator creates an isolated, reactive store
              scoped to a single component instance. Mutations — even nested — automatically
              trigger re-renders. No DI, no shared state, just local component data.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--accent)"></loom-icon>
            <h2>Basic Usage</h2>
          </div>
          <div class="feature-entry">
            <code-block lang="ts" code={`interface TodoState {
  items: string[];
  filter: "all" | "active" | "done";
}

@component("my-todos")
class MyTodos extends LoomElement {
  @store<TodoState>({ items: [], filter: "all" })
  state!: TodoState;

  addItem(text: string) {
    this.state.items.push(text);   // triggers re-render
  }

  update() {
    return <ul>
      {this.state.items.map(i => <li>{i}</li>)}
    </ul>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            <h2>Deep Reactivity</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@store</span> uses a deep <span class="ic">Proxy</span> under
              the hood. Nested property changes, array mutations (<code>push</code>, <code>splice</code>),
              and property deletions all trigger re-renders automatically.
            </div>
            <code-block lang="ts" code={`// All of these trigger a re-render:
this.state.filter = "active";        // top-level set
this.state.meta.count = 5;           // nested set
this.state.items.push("new item");   // array push
this.state.items.splice(0, 1);       // array splice
delete this.state.meta;              // delete`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="database" size={20} color="var(--cyan)"></loom-icon>
            <h2>Persisted Store</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Pass a persistence config as the second argument to automatically
              back the store with <code>localStorage</code>, <code>sessionStorage</code>,
              or any custom <span class="ic">StorageAdapter</span>:
            </div>
            <code-block lang="ts" code={`import { LocalAdapter } from "@toyz/loom";

@component("my-prefs")
class MyPrefs extends LoomElement {
  @store<PrefsState>(
    { theme: "dark", fontSize: 14 },
    { key: "user:prefs", storage: new LocalAdapter() }
  )
  prefs!: PrefsState;

  toggleTheme() {
    this.prefs.theme = this.prefs.theme === "dark" ? "light" : "dark";
    // Auto-persisted to localStorage
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--rose)"></loom-icon>
            <h2>Instance Isolation</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Each component instance gets its own independent copy of the store.
              Changes in one instance don't affect another — even if they share
              the same class.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            <h2>Options</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Argument</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>defaults</code></td><td><code>T</code></td><td>Initial state shape (deep-cloned per instance)</td></tr>
              <tr><td><code>persist.key</code></td><td><code>string</code></td><td>Storage key for persistence</td></tr>
              <tr><td><code>persist.storage</code></td><td><code>StorageAdapter</code></td><td>Storage backend (<code>LocalAdapter</code>, <code>SessionAdapter</code>, etc.)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="compass" size={20} color="var(--amber)"></loom-icon>
            <h2>When to Use</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Need</th><th>Solution</th></tr></thead>
            <tbody>
              <tr><td>Single reactive field</td><td><code>@reactive</code></td></tr>
              <tr><td>Component-scoped store</td><td><code>@store(defaults)</code></td></tr>
              <tr><td>Persisted component store</td><td><code>@store(defaults, persist)</code></td></tr>
              <tr><td>Shared global store</td><td><code>@service</code> + <code>Reactive</code></td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
