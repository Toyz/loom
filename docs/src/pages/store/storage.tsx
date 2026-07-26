/**
 * Store — Storage  /store/storage
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreStorage extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Storage Adapters" subtitle="Pluggable persistence backends for reactive state."></doc-header>

        <section>
          <p>Persisting state sounds like one line of <span class="ic">localStorage</span> and turns into four problems: it is unavailable in some privacy modes and throws rather than returning null, it stores strings so everything needs serialising, it is synchronous and on the main thread, and it has a quota that fails loudly once you cross it.</p>
          <p>A storage adapter puts one interface in front of those. Loom ships three, and they differ in exactly one dimension — how long the value lives.</p>
          <punch-matrix
            columns="SURVIVES RELOAD,SURVIVES TAB CLOSE,SIZE CAPPED,NEEDS BROWSER"
            rows={[
              { name: "MemoryStorage", punches: "", note: "In-process; gone when the tab is" },
              { name: "SessionAdapter", punches: "SURVIVES RELOAD,SIZE CAPPED,NEEDS BROWSER", note: "Per tab, cleared when it closes" },
              { name: "LocalAdapter", punches: "SURVIVES RELOAD,SURVIVES TAB CLOSE,SIZE CAPPED,NEEDS BROWSER", note: "Shared across tabs on the origin" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="StorageAdapter Interface">
            <p>
              All persistence in Loom goes through the <span class="ic">StorageAdapter</span> interface.
              Reactive and CollectionStore accept a storage option, and Loom handles serialization automatically.
            </p>
            <code-block lang="ts" code={`interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}`}></code-block>
        </doc-section>
        <doc-section heading="Built-in Adapters">
          <api-table
            head={["Adapter", "Persists", "Scope"]}
            rows={[
              [<code>MemoryStorage</code>, "Never (default)", "Current session only"],
              [<code>LocalAdapter</code>, "localStorage", "Across tabs &amp; reloads"],
              [<code>SessionAdapter</code>, "sessionStorage", "Current tab only"],
            ]}
          ></api-table>
          <code-block lang="ts" code={`import { Reactive, LocalAdapter, SessionAdapter } from "@toyz/loom/store";

// Persists to localStorage
const prefs = new Reactive({ theme: "dark" }, {
  key: "app:prefs",
  storage: new LocalAdapter(),
});

// Persists to sessionStorage (tab-scoped)
const draft = new Reactive("", {
  key: "compose:draft",
  storage: new SessionAdapter(),
});`}></code-block>
        </doc-section>
        <doc-section heading="@persist">
          <api-entry sig="@persist">
            <p>
              Single-value auto-accessor backed by <span class="ic">Reactive{"<T>"}</span> with automatic persistence. Uses the same <span class="ic">StorageAdapter</span> interface as <span class="ic">@store</span> — same hydration, JSON round-trip, and debounced write-through.
            </p>
            <code-block lang="ts" code={`import { persist } from "@toyz/loom";

// Key = accessor name, persists to localStorage
@persist accessor theme = "dark";

// Explicit storage key
@persist("user-theme") accessor theme = "dark";

// Custom adapter (SessionAdapter, MemoryStorage, etc.)
@persist({ storage: new SessionAdapter() }) accessor theme = "dark";

// Custom key + adapter
@persist({ key: "user-theme", storage: new SessionAdapter() })
accessor theme = "dark";`}></code-block>
          </api-entry>
          <table class="api-table">
            <thead><tr><th>Form</th><th>Key</th><th>Storage</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">@persist</span></td><td>Accessor name</td><td>localStorage</td></tr>
              <tr><td><span class="ic">@persist("key")</span></td><td>Explicit</td><td>localStorage</td></tr>
              <tr><td><span class="ic">{"@persist({ storage })"}</span></td><td>Accessor name</td><td>Custom adapter</td></tr>
              <tr><td><span class="ic">{"@persist({ key, storage })"}</span></td><td>Explicit</td><td>Custom adapter</td></tr>
            </tbody>
          </table>

            <div class="dec-desc" style="margin-top: 1rem;">
              Values are hydrated from storage on first access — if a stored value exists, it takes precedence over the initializer. Changes are debounced and flushed via microtask so rapid writes result in a single storage write.
            </div>
            <code-block lang="ts" code={`// Persisted counter — survives page reloads
@persist accessor visitCount = 0;

connectedCallback() {
  super.connectedCallback();
  this.visitCount++;  // hydrate → increment → auto-persist
}`}></code-block>
        </doc-section>
        <doc-section heading="Custom Adapter">
            <p>
              Implement <span class="ic">StorageAdapter</span> to persist to any backend — IndexedDB, a remote API, etc:
            </p>
            <code-block lang="ts" code={`class IndexedDBAdapter implements StorageAdapter {
  private cache = new Map<string, string>();

  get(key: string) {
    return this.cache.get(key) ?? null;
  }

  set(key: string, value: string) {
    this.cache.set(key, value);
    // async write to IndexedDB
    idbSet(key, value);
  }

  remove(key: string) {
    this.cache.delete(key);
    idbDelete(key);
  }
}

const store = new Reactive([], {
  key: "app:items",
  storage: new IndexedDBAdapter(),
});`}></code-block>
        </doc-section>
        <doc-section heading="Swapping at Runtime">
            <p>
              Use <span class="ic">swapStorage()</span> to change backends without losing data:
            </p>
            <code-block lang="ts" code={`// Start in memory, upgrade to persistent after auth
const userData = new Reactive(null);

onLogin(() => {
  userData.swapStorage({
    key: "user:data",
    storage: new LocalAdapter(),
  });
});`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
