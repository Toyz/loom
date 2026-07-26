/**
 * Store — Patterns  /store/patterns
 *
 * @lazy loaded — registered in main.tsx
 */
import { LoomElement } from "@toyz/loom";

export default class PageStorePatterns extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Patterns" subtitle="Common patterns for wiring stores into components and services."></doc-header>

        <section>
          <p>Once state outgrows a single component there are only a few honest places to put it: alongside the component that owns it, in a service resolved from the container, or in a store passed down through context. Most state-management complexity is the cost of not deciding which.</p>
          <p>The patterns here are the three that hold up. Each is shown with the wiring it actually needs, including the teardown, because the subscription you forget to release is the bug that shows up two weeks later as a memory leak.</p>
        </section>

        <section>
          <div class="group-header">
            <h2>@watch — Auto-Subscribe Components</h2>
          </div>
            <p>
              The <span class="ic">@watch</span> decorator subscribes a component method to a store,
              auto-calls <span class="ic">scheduleUpdate()</span> after each change, and cleans up on disconnect.
              It supports three forms:
            </p>

            <h3>Direct Store Instance</h3>
            <p>Pass a <span class="ic">Reactive</span> or <span class="ic">CollectionStore</span> variable directly:</p>
            <code-block lang="tsx" code={`import { component, LoomElement } from "@toyz/loom";
import { CollectionStore, LocalAdapter } from "@toyz/loom/store";
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
          <li loom-key={t.id}>{t.text}</li>
        ))}
      </ul>
    );
  }
}`}></code-block>

            <h3>DI-Resolved Service</h3>
            <p>Pass a <span class="ic">@service</span> class — the decorator resolves it via <span class="ic">app.get()</span>:</p>
            <code-block lang="ts" code={`import { service, inject } from "@toyz/loom/di";
import { Reactive, LocalAdapter } from "@toyz/loom/store";

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
  @reactive accessor count = 0;

  @watch("count")
  onCountChanged(value: number, prev: number) {
    console.log(\`count: \${prev} → \${value}\`);
  }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <h2>Derived Values</h2>
          </div>
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
          <div class="group-header">
            <h2>Deferred Persistence</h2>
          </div>
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
        <doc-nav></doc-nav>
      </div>
    );
  }
}
