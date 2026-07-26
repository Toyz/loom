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
        <doc-header title="State Management" subtitle="Reactive primitives, component stores, and persistent storage — everything you need to manage state in Loom."></doc-header>

        <section>
          <p>Loom has five ways to declare state, which sounds like four too many until you notice they answer different questions. Does a change to a nested field count. Does the value survive a reload. Is it derived from other state. Does anything outside the component need to read it.</p>
          <p>Pick by answering those, not by reaching for the most powerful one. <span class="ic">@reactive</span> is the default and covers most fields; the others each add one capability and the cost that comes with it.</p>

        {/* ═══════════ Philosophy ═══════════ */}
          <punch-matrix
            columns="RE-RENDERS,DEEP,PERSISTS,LAZY,EXTERNAL API"
            rows={[
              { name: "@reactive", punches: "RE-RENDERS", note: "One value; assignment schedules a render" },
              { name: "@store", punches: "RE-RENDERS,DEEP", note: "Nested mutation is tracked too" },
              { name: "@persist", punches: "RE-RENDERS,PERSISTS", note: "Rehydrates on construction" },
              { name: "@computed", punches: "RE-RENDERS,LAZY", note: "Recomputes only when a dependency changed" },
              { name: "@signal", punches: "RE-RENDERS,EXTERNAL API", note: "Readable as a TC39 Signal from outside" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Philosophy">
            <p>
              Loom provides layered state management. Start simple with <span class="ic">@reactive</span> fields,
              scale up to <span class="ic">@store</span> for component-scoped deep reactivity,
              or use <span class="ic">Reactive&lt;T&gt;</span> and <span class="ic">CollectionStore&lt;T&gt;</span> for
              shared, service-level state. Every layer supports optional persistence.
            </p>
        </doc-section>
        {/* ═══════════ At a Glance ═══════════ */}

        <doc-section heading="At a Glance">
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
        </doc-section>
        {/* ═══════════ Quick Example ═══════════ */}

        <doc-section heading="Quick Example">
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
        </doc-section>
        {/* ═══════════ Choosing ═══════════ */}

        <doc-section heading="Choosing the Right Tool">
          <table class="api-table">
            <thead><tr><th>Need</th><th>Solution</th><th>Page</th></tr></thead>
            <tbody>
              <tr><td>Observable values & collections</td><td><code>Reactive&lt;T&gt;</code>, <code>CollectionStore</code></td><td><loom-link to="/store/reactive">Reactive</loom-link></td></tr>
              <tr><td>Component-scoped deep state</td><td><code>@store</code></td><td><loom-link to="/store/store-decorator">@store</loom-link></td></tr>
              <tr><td>Persistent data</td><td><code>StorageAdapter</code></td><td><loom-link to="/store/storage">Storage</loom-link></td></tr>
              <tr><td>Patterns & best practices</td><td>Combining primitives</td><td><loom-link to="/store/patterns">Patterns</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
