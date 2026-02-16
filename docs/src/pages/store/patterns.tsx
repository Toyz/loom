/**
 * Store — Patterns  /store/patterns
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { StoreGroup } from "../../groups";

@route("/patterns", { group: StoreGroup })
@component("page-store-patterns")
export class PageStorePatterns extends LoomElement {
  update() {
    return (
      <div>
        <h1>Patterns</h1>
        <p class="subtitle">Common patterns for wiring stores into components and services.</p>

        <section>
          <h2>@watch — Auto-Subscribe Components</h2>
          <p>
            The <span class="ic">@watch</span> decorator subscribes a component method to a store,
            auto-calls <span class="ic">scheduleUpdate()</span> after each change, and cleans up on disconnect.
            It supports three forms:
          </p>

          <h3>Direct Store Instance</h3>
          <p>Pass a <span class="ic">Reactive</span> or <span class="ic">CollectionStore</span> variable directly:</p>
          <code-block lang="tsx" code={`import { component, LoomElement, CollectionStore, LocalAdapter } from "@toyz/loom";
import { watch } from "@toyz/loom/decorators";

interface Todo { id: string; text: string; done: boolean }

const todos = new CollectionStore<Todo>([], {
  key: "app:todos",
  storage: new LocalAdapter(),
});

@component("todo-list")
class TodoList extends LoomElement {
  @watch(todos)
  onTodos(items: Todo[]) {
    // called with (value, prev) on every change
    // scheduleUpdate() is called automatically
  }

  update() {
    return (
      <ul>
        {todos.value.map(t => (
          <li data-loom-key={t.id}>{t.text}</li>
        ))}
      </ul>
    );
  }
}`}></code-block>

          <h3>DI-Resolved Service</h3>
          <p>Pass a <span class="ic">@service</span> class — the decorator resolves it via <span class="ic">app.get()</span>:</p>
          <code-block lang="ts" code={`import { service, inject } from "@toyz/loom";
import { Reactive, LocalAdapter } from "@toyz/loom";

@service
class ThemeService {
  readonly theme = new Reactive("dark", {
    key: "app:theme",
    storage: new LocalAdapter(),
  });

  toggle() {
    this.theme.set(prev => prev === "dark" ? "light" : "dark");
  }
}`}></code-block>

          <code-block lang="tsx" code={`import { watch } from "@toyz/loom/decorators";

@component("theme-toggle")
class ThemeToggle extends LoomElement {
  // Watch a specific property on the DI-resolved service
  @watch(ThemeService, "theme")
  onTheme(value: string, prev: string) {
    document.body.className = value;
  }

  update() {
    return <button>Toggle Theme</button>;
  }
}`}></code-block>

          <h3>Local @reactive Field</h3>
          <p>Pass a field name as a string to watch a local <span class="ic">@reactive</span> property:</p>
          <code-block lang="ts" code={`@component("my-counter")
class MyCounter extends LoomElement {
  @reactive count = 0;

  @watch("count")
  onCountChanged(value: number, prev: number) {
    console.log(\`count: \${prev} → \${value}\`);
  }
}`}></code-block>
        </section>

        <section>
          <h2>Derived Values</h2>
          <p>
            Derive computed state by subscribing to one store and updating another:
          </p>
          <code-block lang="ts" code={`const items = new CollectionStore<Item>();
const count = new Reactive(0);

// Keep count in sync
items.subscribe((list) => {
  count.set(list.length);
});`}></code-block>
        </section>

        <section>
          <h2>Deferred Persistence</h2>
          <p>
            Start in-memory and upgrade to persistent storage later using <span class="ic">swapStorage()</span>.
            Useful for stores that shouldn't persist until the user is authenticated:
          </p>
          <code-block lang="ts" code={`const prefs = new Reactive({ volume: 80, muted: false });

// After login, persist to localStorage
function onAuthenticated() {
  prefs.swapStorage({
    key: "user:prefs",
    storage: new LocalAdapter(),
  });
}`}></code-block>
        </section>
      </div>
    );
  }
}
