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
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            <h2>StorageAdapter Interface</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              All persistence in Loom goes through the <span class="ic">StorageAdapter</span> interface.
              Reactive and CollectionStore accept a storage option, and Loom handles serialization automatically.
            </div>
            <code-block lang="ts" code={`interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="package" size={20} color="var(--emerald)"></loom-icon>
            <h2>Built-in Adapters</h2>
          </div>
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
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--amber)"></loom-icon>
            <h2>Custom Adapter</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Implement <span class="ic">StorageAdapter</span> to persist to any backend — IndexedDB, a remote API, etc:
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--cyan)"></loom-icon>
            <h2>Swapping at Runtime</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use <span class="ic">swapStorage()</span> to change backends without losing data:
            </div>
            <code-block lang="ts" code={`// Start in memory, upgrade to persistent after auth
const userData = new Reactive(null);

onLogin(() => {
  userData.swapStorage({
    key: "user:data",
    storage: new LocalAdapter(),
  });
});`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
