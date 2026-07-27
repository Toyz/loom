/**
 * Loom — Storage adapters
 *
 * StorageAdapter defines the contract for persistent stores.
 * Ships with LocalAdapter (localStorage) and SessionAdapter (sessionStorage).
 */

/**
 * Contract for storage backends used by Reactive's persist option.
 */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** @deprecated Use StorageAdapter */
export type StorageMedium = StorageAdapter;

/**
 * Persist options for Reactive / CollectionStore constructors.
 */
export interface PersistOptions {
  key: string;
  storage: StorageAdapter;
  /**
   * Adopt writes made to the same key by another tab (default: false).
   *
   * Off, two tabs of the same app diverge the moment either writes: each
   * holds its own copy in memory and only reads storage once, at
   * construction, so the last tab to write wins the stored value while both
   * keep rendering something else. On, a write in one tab lands in the
   * others.
   *
   * Opt-in because turning it on changes what an existing app does, not
   * because per-tab divergence is ever what you wanted. Use `SessionAdapter`
   * if the value genuinely belongs to one tab.
   */
  sync?: boolean;
}

/**
 * In-memory storage. Useful for testing or transient state.
 */
export class MemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();
  get(key: string) { return this.data.get(key) ?? null; }
  set(key: string, value: string) { this.data.set(key, value); }
  remove(key: string) { this.data.delete(key); }
}

/**
 * localStorage adapter. Silently falls back on errors (SSR, iframe sandbox).
 */
export class LocalAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota exceeded or unavailable */
    }
  }
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* unavailable */
    }
  }
}

/**
 * sessionStorage adapter. Silently falls back on errors.
 */
export class SessionAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* quota exceeded or unavailable */
    }
  }
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* unavailable */
    }
  }
}

/** @deprecated Use LocalAdapter */
export const LocalMedium = LocalAdapter;

/** @deprecated Use SessionAdapter */
export const SessionMedium = SessionAdapter;

/**
 * IndexedDB adapter.
 *
 * `StorageAdapter` is deliberately synchronous, because that is what
 * `Reactive` needs at construction to hydrate before the first render.
 * IndexedDB is not, so this keeps an in-memory mirror: reads are served from
 * it, writes go to memory immediately and to IndexedDB in the background.
 *
 * The trade that buys: no size limit worth worrying about (localStorage caps
 * around 5MB and throws when you cross it) and no main-thread serialisation
 * cost on write. The trade it costs: the first read after a page load, before
 * {@link IndexedDBAdapter.ready} resolves, sees nothing.
 *
 * ```ts
 * const db = new IndexedDBAdapter("my-app");
 * await db.ready;                 // hydrate before mounting the app
 * app.start();
 * ```
 *
 * Awaiting `ready` before `app.start()` is the whole of the correct usage. It
 * is not enforced, because a component that renders empty and fills in a
 * moment later is a legitimate thing to want.
 */
export class IndexedDBAdapter implements StorageAdapter {
  private mirror = new Map<string, string>();
  private db: Promise<IDBDatabase | null>;
  /** Resolves once the store has been read into memory. */
  readonly ready: Promise<void>;

  constructor(
    private dbName = "loom",
    private storeName = "kv",
  ) {
    this.db = this.openDb();
    this.ready = this.hydrate();
  }

  private openDb(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
      if (!idb) return resolve(null);
      let req: IDBOpenDBRequest;
      try {
        req = idb.open(this.dbName, 1);
      } catch {
        return resolve(null); // blocked in some sandboxed and private contexts
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  private async hydrate(): Promise<void> {
    const db = await this.db;
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return resolve();
          if (typeof cursor.value === "string") {
            this.mirror.set(String(cursor.key), cursor.value);
          }
          cursor.continue();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private async write(key: string, value: string | null): Promise<void> {
    const db = await this.db;
    if (!db) return;
    try {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      if (value === null) store.delete(key);
      else store.put(value, key);
    } catch {
      /* the database was closed or the transaction could not start */
    }
  }

  get(key: string): string | null {
    return this.mirror.get(key) ?? null;
  }

  set(key: string, value: string): void {
    // Memory first so a read straight after a write is correct, which is what
    // the synchronous contract promises.
    this.mirror.set(key, value);
    void this.write(key, value);
  }

  remove(key: string): void {
    this.mirror.delete(key);
    void this.write(key, null);
  }
}
