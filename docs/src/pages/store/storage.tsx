/**
 * Store — Storage  /store/storage
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreStorage extends LoomElement {
  update() {
    return (
      <div>
        <h1>Storage Adapters</h1>
        <p class="subtitle">Pluggable persistence backends for reactive state.</p>

        <section>
          <h2>StorageAdapter Interface</h2>
          <p>
            All persistence in Loom goes through the <span class="ic">StorageAdapter</span> interface.
            Reactive and CollectionStore accept a storage option, and Loom handles serialization automatically.
          </p>
          <code-block lang="ts" code={`interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}`}></code-block>
        </section>

        <section>
          <h2>Built-in Adapters</h2>
          <table class="api-table">
            <thead><tr><th>Adapter</th><th>Persists</th><th>Scope</th></tr></thead>
            <tbody>
              <tr><td><code>MemoryStorage</code></td><td>Never (default)</td><td>Current session only</td></tr>
              <tr><td><code>LocalAdapter</code></td><td>localStorage</td><td>Across tabs &amp; reloads</td></tr>
              <tr><td><code>SessionAdapter</code></td><td>sessionStorage</td><td>Current tab only</td></tr>
            </tbody>
          </table>
          <code-block lang="ts" code={`import { Reactive, LocalAdapter, SessionAdapter } from "@toyz/loom";

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
        </section>

        <section>
          <h2>Custom Adapter</h2>
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
        </section>

        <section>
          <h2>Swapping at Runtime</h2>
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
        </section>
      </div>
    );
  }
}
