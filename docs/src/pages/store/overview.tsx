/**
 * Store — Overview  /store/overview
 *
 * Introduction to Loom's state management primitives.
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>State Management</h1>
        <p class="subtitle">Reactive primitives, component stores, and persistent storage — everything you need to manage state in Loom.</p>

        <section>
          <h2>Philosophy</h2>
          <p>
            Loom provides layered state management. Start simple with <span class="ic">@reactive</span> fields,
            scale up to <span class="ic">@store</span> for component-scoped deep reactivity,
            or use <span class="ic">Reactive&lt;T&gt;</span> and <span class="ic">CollectionStore&lt;T&gt;</span> for
            shared, service-level state. Every layer supports optional persistence.
          </p>
        </section>

        <section>
          <h2>At a Glance</h2>
          <table class="api-table">
            <thead><tr><th>Primitive</th><th>Scope</th><th>Use Case</th></tr></thead>
            <tbody>
              <tr><td><code>@reactive</code></td><td>Field</td><td>Single reactive property on a component</td></tr>
              <tr><td><code>@store</code></td><td>Component</td><td>Deep-reactive object store, isolated per instance</td></tr>
              <tr><td><code>Reactive&lt;T&gt;</code></td><td>Shared</td><td>Observable value container, usable anywhere</td></tr>
              <tr><td><code>CollectionStore&lt;T&gt;</code></td><td>Shared</td><td>CRUD array store with add/remove/update</td></tr>
              <tr><td><code>StorageAdapter</code></td><td>Any</td><td>Pluggable persistence (localStorage, sessionStorage, custom)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Quick Example</h2>
          <code-block lang="ts" code={`import { LoomElement, component, reactive, store } from "@toyz/loom";

// Simple: single reactive field
@component("click-counter")
class ClickCounter extends LoomElement {
  @reactive accessor count = 0;

  update() {
    return <button onclick={() => this.count++}>
      Clicked {this.count} times
    </button>;
  }
}

// Advanced: component-scoped store with persistence
@component("todo-app")
class TodoApp extends LoomElement {
  @store<{ items: string[] }>({ items: [] }, {
    key: "todos",
    storage: new LocalAdapter(),
  })
  state!: { items: string[] };

  update() {
    return <ul>
      {this.state.items.map(i => <li>{i}</li>)}
    </ul>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>Choosing the Right Tool</h2>
          <table class="api-table">
            <thead><tr><th>Need</th><th>Solution</th><th>Page</th></tr></thead>
            <tbody>
              <tr><td>Observable values & collections</td><td><code>Reactive&lt;T&gt;</code>, <code>CollectionStore</code></td><td><loom-link to="/store/reactive">Reactive</loom-link></td></tr>
              <tr><td>Component-scoped deep state</td><td><code>@store</code></td><td><loom-link to="/store/store-decorator">@store</loom-link></td></tr>
              <tr><td>Persistent data</td><td><code>StorageAdapter</code></td><td><loom-link to="/store/storage">Storage</loom-link></td></tr>
              <tr><td>Patterns & best practices</td><td>Combining primitives</td><td><loom-link to="/store/patterns">Patterns</loom-link></td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
