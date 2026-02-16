/**
 * Loom — Storage Medium
 *
 * Pluggable persistence for Reactive<T> and CollectionStore<T>.
 * Three built-in implementations: Memory (default), Local, Session.
 * Implement StorageMedium for custom backends (IndexedDB, NATS KV, REST, etc).
 */

/** Sync read/write contract for a storage medium */
export interface StorageMedium {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Options bag for persistent Reactive/CollectionStore */
export interface PersistOptions {
  /** Storage key — must be unique across your app */
  key: string;
  /** Storage medium — defaults to MemoryStorage (no persistence) */
  storage: StorageMedium;
}

/**
 * In-memory storage. No persistence — values lost on page reload.
 * This is the implicit default when no storage is configured.
 */
export class MemoryStorage implements StorageMedium {
  private data = new Map<string, string>();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }
}

/**
 * localStorage wrapper — survives page reloads and browser restarts.
 *
 * ```ts
 * const count = new Reactive(0, { key: "app:count", storage: new LocalMedium() });
 * ```
 */
export class LocalMedium implements StorageMedium {
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
      // Storage full or blocked — silent fail
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  }
}

/**
 * sessionStorage wrapper — survives page reloads but not browser restarts.
 *
 * ```ts
 * const temp = new Reactive("", { key: "app:temp", storage: new SessionMedium() });
 * ```
 */
export class SessionMedium implements StorageMedium {
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
      // Storage full or blocked — silent fail
    }
  }

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Silent fail
    }
  }
}
