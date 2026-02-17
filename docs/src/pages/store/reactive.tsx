/**
 * Store — Reactive  /store/reactive
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreReactive extends LoomElement {
  update() {
    return (
      <div>
        <h1>Reactive State</h1>
        <p class="subtitle">Observable values and CRUD collections with optional persistence.</p>

        <section>
          <h2>Reactive&lt;T&gt;</h2>
          <p>A generic observable value container. Notifies subscribers when the value changes.</p>
          <code-block lang="ts" code={`import { Reactive, LocalAdapter } from "@toyz/loom";

// In-memory (lost on reload)
const count = new Reactive(0);

// Persisted to localStorage
const settings = new Reactive({ theme: "dark" }, {
  key: "app:settings",
  storage: new LocalAdapter(),
});`}></code-block>

          <table class="api-table">
            <thead><tr><th>Method / Property</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.value</code></td><td>Get the current value</td></tr>
              <tr><td><code>.set(next)</code></td><td>Set a new value or pass an updater <code>(prev) =&gt; next</code></td></tr>
              <tr><td><code>.subscribe(fn)</code></td><td>Listen for changes. Returns an unsubscribe function.</td></tr>
              <tr><td><code>.watch(fn)</code></td><td>Like subscribe, but calls immediately with the current value</td></tr>
              <tr><td><code>.clear(resetTo)</code></td><td>Remove persisted data and reset to a value</td></tr>
              <tr><td><code>.swapStorage(opts)</code></td><td>Switch storage backend at runtime</td></tr>
            </tbody>
          </table>

          <code-block lang="ts" code={`// Updater function pattern
count.set(prev => prev + 1);

// Subscribe
const unsub = count.subscribe((value, prev) => {
  console.log(\`Changed from \${prev} to \${value}\`);
});

// Watch (immediate + subscribe)
count.watch((value) => render(value));

// Cleanup
unsub();`}></code-block>
        </section>

        <section>
          <h2>CollectionStore&lt;T&gt;</h2>
          <p>
            CRUD layer over <span class="ic">Reactive&lt;T[]&gt;</span>. Items must have an <span class="ic">id: string</span> field.
            Auto-generates UUIDs if omitted.
          </p>
          <code-block lang="ts" code={`import { CollectionStore, LocalAdapter } from "@toyz/loom";

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const todos = new CollectionStore<Todo>([], {
  key: "app:todos",
  storage: new LocalAdapter(),
});`}></code-block>

          <table class="api-table">
            <thead><tr><th>Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.add(item)</code></td><td>Add an item. If no <code>id</code>, one is auto-generated. Returns the full item.</td></tr>
              <tr><td><code>.remove(id)</code></td><td>Remove an item by id</td></tr>
              <tr><td><code>.update(id, patch)</code></td><td>Merge a partial update into an item. Returns the updated item.</td></tr>
              <tr><td><code>.find(id)</code></td><td>Find an item by id, or <code>undefined</code></td></tr>
              <tr><td><code>.value</code></td><td>The full array (inherited from Reactive)</td></tr>
            </tbody>
          </table>

          <code-block lang="ts" code={`// Add
const todo = todos.add({ text: "Ship it", done: false });
// todo.id is auto-generated

// Update
todos.update(todo.id, { done: true });

// Remove
todos.remove(todo.id);

// Subscribe to changes
todos.subscribe((items) => {
  console.log(\`\${items.length} todos\`);
});`}></code-block>
        </section>

        <section>
          <h2>Persistence Migration</h2>
          <p>
            Use <span class="ic">swapStorage</span> to upgrade storage backend at runtime — for example,
            starting in-memory and switching to localStorage once the user logs in:
          </p>
          <code-block lang="ts" code={`import { Reactive, LocalAdapter } from "@toyz/loom";

// Start in-memory (anonymous user)
const prefs = new Reactive({ theme: "dark", lang: "en" });

// Later: user logs in, persist to localStorage
prefs.swapStorage({
  key: \`user:\${userId}:prefs\`,
  storage: new LocalAdapter(),
});
// Current value is saved to localStorage immediately.
// Future changes are automatically persisted.

// Log out: remove storage, keep in-memory
prefs.clear({ theme: "dark", lang: "en" });`}></code-block>
        </section>
      </div>
    );
  }
}
