/**
 * Storage — /core/storage
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/core/storage")
@component("page-storage")
export class PageStorage extends LoomElement {
  update() {
    return (
      <div>
        <h1>Storage</h1>
        <p class="subtitle">Pluggable persistence backends for reactive state.</p>

        <section>
          <h2>StorageMedium Interface</h2>
          <p>
            All persistence in Loom goes through the <span class="ic">StorageMedium</span> interface.
            Reactive and CollectionStore accept a storage option, and Loom handles serialization automatically.
          </p>
          <code-block lang="ts" code={`interface StorageMedium {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}`}></code-block>
        </section>

        <section>
          <h2>Built-in Backends</h2>
          <table class="api-table">
            <thead><tr><th>Backend</th><th>Persists</th><th>Scope</th></tr></thead>
            <tbody>
              <tr><td><code>MemoryStorage</code></td><td>Never (default)</td><td>Current session only</td></tr>
              <tr><td><code>LocalMedium</code></td><td>localStorage</td><td>Across tabs &amp; reloads</td></tr>
              <tr><td><code>SessionMedium</code></td><td>sessionStorage</td><td>Current tab only</td></tr>
            </tbody>
          </table>
          <code-block lang="ts" code={`import { Reactive, LocalMedium, SessionMedium } from "@toyz/loom";

// Persists to localStorage
const prefs = new Reactive({ theme: "dark" }, {
  key: "app:prefs",
  storage: new LocalMedium(),
});

// Persists to sessionStorage (tab-scoped)
const draft = new Reactive("", {
  key: "compose:draft",
  storage: new SessionMedium(),
});`}></code-block>
        </section>

        <section>
          <h2>Custom Backend</h2>
          <p>
            Implement <span class="ic">StorageMedium</span> to persist to any backend — IndexedDB, a remote API, etc:
          </p>
          <code-block lang="ts" code={`class IndexedDBMedium implements StorageMedium {
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
  storage: new IndexedDBMedium(),
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
    storage: new LocalMedium(),
  });
});`}></code-block>
        </section>
      </div>
    );
  }
}
