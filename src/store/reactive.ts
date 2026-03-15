/**
 * Loom — Reactive primitives
 *
 * Reactive<T>       — Observable value container for any shape
 * CollectionStore<T> — CRUD over Reactive<T[]> for identifiable items
 *
 * Both support optional persistent storage via StorageAdapter.
 */

import type { PersistOptions, StorageAdapter } from "./storage";
import { __getActiveDeps } from "../trace";

export type Subscriber<T> = (value: T, prev: T) => void;
export type Updater<T> = T | ((prev: T) => T);

/**
 * Observable value container. Works with any data shape.
 * Optionally backs to a StorageAdapter for auto-persistence.
 *
 * ```ts
 * // In-memory (default)
 * const count = new Reactive(0);
 *
 * // Auto-persisted to localStorage
 * const count = new Reactive(0, { key: "app:count", storage: new LocalAdapter() });
 * ```
 */
export class Reactive<T> {
  private _value: T;
  private _subs: Subscriber<T>[] = [];
  private _key?: string;
  private _storage?: StorageAdapter;
  /** Pre-computed persist flag — avoids double property check on every set() */
  private _persists = false;
  /** Monotonic version counter — bumps on every set() and notify() */
  private _version = 0;
  /** Debounced persistence — coalesces N mutations into 1 storage write per microtask */
  private _persistScheduled = false;
  private _flushPersist = (): void => {
    this._persistScheduled = false;
    this._storage!.set(this._key!, JSON.stringify(this._value));
  };

  constructor(initial: T, persist?: PersistOptions) {
    this._key = persist?.key;
    this._storage = persist?.storage;

    // Try to hydrate from storage
    if (this._key && this._storage) {
      const stored = this._storage.get(this._key);
      if (stored !== null) {
        try {
          this._value = JSON.parse(stored) as T;
        } catch {
          this._value = initial;
        }
      } else {
        this._value = initial;
      }
    } else {
      this._value = initial;
    }
    this._persists = !!(this._key && this._storage);
  }

  get value(): T {
    const deps = __getActiveDeps();
    if (deps) deps.add(this);
    return this._value;
  }

  /** Read without triggering trace recording — used for snapshot comparisons */
  peek(): T {
    return this._value;
  }

  /** Read the version counter without triggering trace — used by hasDirtyDeps */
  peekVersion(): number {
    return this._version;
  }

  set(next: Updater<T>): void {
    const prev = this._value;
    this._value =
      typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
    if (this._value !== prev) {
      this._version++;
      if (this._persists && !this._persistScheduled) {
        this._persistScheduled = true;
        queueMicrotask(this._flushPersist);
      }
      // Snapshot — unsubscribe during notify does splice, shifting indices
      const snapshot = Array.from(this._subs);
      for (let i = 0; i < snapshot.length; i++) snapshot[i](this._value, prev);
    }
  }

  /** Subscribe to changes. Returns unsubscribe function. */
  subscribe(fn: Subscriber<T>): () => void {
    this._subs.push(fn);
    return () => {
      const idx = this._subs.indexOf(fn);
      if (idx >= 0) this._subs.splice(idx, 1);
    };
  }

  /** Subscribe and immediately call with current value */
  watch(fn: Subscriber<T>): () => void {
    fn(this._value, this._value);
    return this.subscribe(fn);
  }

  /**
   * Force-notify all subscribers without changing the value.
   * Used for in-place mutations (e.g. deep proxy on @store)
   * where the reference doesn't change but contents did.
   */
  notify(): void {
    this._version++;
    if (this._persists && !this._persistScheduled) {
      this._persistScheduled = true;
      queueMicrotask(this._flushPersist);
    }
    const snapshot = Array.from(this._subs);
    for (let i = 0; i < snapshot.length; i++) snapshot[i](this._value, this._value);
  }

  /** Clear persisted data and reset to a value */
  clear(resetTo: T): void {
    if (this._key && this._storage) {
      this._storage.remove(this._key);
    }
    this.set(resetTo);
  }

  /** Swap the storage medium at runtime (e.g. upgrade from local to remote) */
  swapStorage(persist: PersistOptions): void {
    // Persist current value to new storage
    this._key = persist.key;
    this._storage = persist.storage;
    this._storage.set(this._key, JSON.stringify(this._value));
  }
}

/**
 * Items must have an `id` field to be stored in a CollectionStore.
 */
export interface Identifiable {
  id: string;
}

/**
 * CRUD collection backed by Reactive<T[]>.
 * Supports optional persistent storage via StorageAdapter.
 *
 * ```ts
 * // In-memory
 * const items = new CollectionStore<Item>();
 *
 * // Persisted to localStorage
 * const items = new CollectionStore<Item>([], {
 *   key: "app:items",
 *   storage: new LocalAdapter(),
 * });
 * ```
 */
export class CollectionStore<
  T extends Identifiable,
> extends Reactive<T[]> {
  constructor(initial: T[] = [], persist?: PersistOptions) {
    super(initial, persist);
  }

  /** Add an item. If no `id` provided, one is auto-generated. */
  add(item: Omit<T, "id"> & { id?: string }): T {
    const full = { ...item, id: item.id ?? crypto.randomUUID() } as T;
    this.peek().push(full);
    this.notify();
    return full;
  }

  /** Remove an item by id */
  remove(id: string): void {
    const arr = this.peek();
    const idx = arr.findIndex((i) => i.id === id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      this.notify();
    }
  }

  /** Patch an item by id */
  update(id: string, patch: Partial<T>): T {
    const arr = this.peek();
    const item = arr.find((i) => i.id === id);
    if (!item) return undefined as unknown as T;
    Object.assign(item, patch, { id });
    this.notify();
    return item;
  }

  /** Clear all items (and persisted data if any) */
  clear(): void {
    super.clear([] as unknown as T[]);
  }

  /** Find an item by id */
  find(id: string): T | undefined {
    return this.value.find((i) => i.id === id);
  }
}
