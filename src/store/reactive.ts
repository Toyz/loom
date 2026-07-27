/**
 * Loom — Reactive primitives
 *
 * Reactive<T>       — Observable value container for any shape
 * CollectionStore<T> — CRUD over Reactive<T[]> for identifiable items
 *
 * Both support optional persistent storage via StorageAdapter.
 */

import type { PersistOptions, StorageAdapter } from "./storage.js";
import { __getActiveDeps } from "../trace.js";

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
  /** Reused snapshot for notify — avoids an allocation per set()/notify() */
  private _notifyScratch: Subscriber<T>[] = [];
  /** True while a dispatch is iterating _notifyScratch */
  private _notifyBusy = false;
  private _key?: string;
  private _storage?: StorageAdapter;
  /** Pre-computed persist flag — avoids double property check on every set() */
  private _persists = false;
  /** Cross-tab listener teardown, when persist({ sync: true }). */
  private _syncOff: (() => void) | null = null;
  /** Monotonic version counter — bumps on every set() and notify() */
  private _version = 0;
  /** Debounced persistence — coalesces N mutations into 1 storage write per microtask */
  private _persistScheduled = false;
  /** Set by clear() to make an already-queued flush a no-op */
  private _persistCancelled = false;
  private _flushPersist = (): void => {
    this._persistScheduled = false;
    if (this._persistCancelled) { this._persistCancelled = false; return; }
    if (!this._persists) return;
    const raw = JSON.stringify(this._value);
    this._storage!.set(this._key!, raw);
    // The storage event covers localStorage across tabs; the channel covers
    // every other adapter, and reaches same-tab listeners the event skips.
    this._broadcast?.(raw);
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
    if (this._persists && persist?.sync) this._startSync();
  }

  /**
   * Adopt writes made to the same key by another tab.
   *
   * Without this, two tabs of the same app both persisting to one key diverge
   * the moment either writes: each holds its own value in memory and only
   * reads storage once, at construction. Nothing surfaces the conflict --
   * whichever tab writes last wins the stored copy, and both keep rendering
   * something else.
   *
   * The `storage` event is the right primitive: the browser fires it in every
   * *other* tab and never in the one that made the change, so a write cannot
   * echo back to its origin. BroadcastChannel is added alongside it because
   * `storage` only fires for localStorage -- a session or in-memory adapter
   * needs a channel of its own.
   */
  private _startSync(): void {
    const key = this._key!;
    const offs: Array<() => void> = [];

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        this._applyRemote(e.newValue);
      };
      window.addEventListener("storage", onStorage as EventListener);
      offs.push(() => window.removeEventListener("storage", onStorage as EventListener));
    }

    const BC = (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel;
    if (typeof BC === "function") {
      try {
        const channel = new BC(`loom:persist:${key}`);
        channel.onmessage = (e: MessageEvent) => this._applyRemote(e.data as string | null);
        this._broadcast = (raw) => {
          try { channel.postMessage(raw); } catch { /* channel closed */ }
        };
        offs.push(() => {
          this._broadcast = null;
          try { channel.close(); } catch { /* already closed */ }
        });
      } catch {
        /* unavailable (some sandboxed contexts) -- storage events still work */
      }
    }

    this._syncOff = () => { for (const off of offs) off(); };
  }

  /** Push a local write to other tabs. Null when there is no channel. */
  private _broadcast: ((raw: string | null) => void) | null = null;

  /**
   * Take a value written by another tab.
   *
   * Applied straight to the field rather than through `set()`: persisting it
   * again would be writing back what we were just told, and on a channel that
   * would bounce between tabs indefinitely.
   */
  private _applyRemote(raw: string | null): void {
    if (raw === null) return; // key cleared elsewhere; keep what we have
    let next: T;
    try {
      next = JSON.parse(raw) as T;
    } catch {
      return; // not ours, or truncated
    }
    const prev = this._value;
    if (prev === next) return;
    this._value = next;
    this._version++;
    this._notifySubscribers(prev);
  }

  /**
   * Stop listening for other tabs.
   *
   * A `@persist({ sync: true })` field on a component would otherwise hold a
   * window listener for the life of the page, one per instance ever created.
   */
  dispose(): void {
    this._syncOff?.();
    this._syncOff = null;
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
    // Change detection with NaN handling. Plain `!==` reported NaN → NaN as a
    // change, so a NaN-valued Reactive bumped its version and notified on
    // every write — an unbounded re-render loop.
    //
    // `Object.is` expresses this directly but measured 15-59% slower on the
    // set() benchmarks (it is SameValue, not a single machine compare). The
    // self-comparison below keeps `!==` as the short-circuiting fast path and
    // only pays extra on a real change: if both sides are NaN then neither
    // self-equals, so the guard collapses to false.
    const v = this._value;
    if (v !== prev && (v === v || prev === prev)) {
      this._version++;
      if (this._persists && !this._persistScheduled) {
        this._persistScheduled = true;
        queueMicrotask(this._flushPersist);
      }
      this._notifySubscribers(prev);
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
    this._notifySubscribers(this._value);
  }

  /**
   * Copy subscriber refs into scratch then invoke — safe if a handler
   * unsubscribes mid-loop.
   *
   * Two reentrancy rules, both load-bearing when a subscriber writes back into
   * this same Reactive (e.g. a clamping `@watch`):
   *   - the nested call must NOT reuse `_notifyScratch`, or the outer loop
   *     resumes over a buffer the inner call overwrote;
   *   - `this._value` must be re-read per subscriber, not hoisted, or later
   *     subscribers are handed a value that is already stale.
   * Depth 0 — the overwhelmingly common case — keeps the zero-alloc path.
   */
  private _notifySubscribers(prev: T): void {
    const subs = this._subs;
    const n = subs.length;
    if (n === 0) return;
    // Claim the scratch buffer for the duration of the dispatch; a re-entrant
    // notify allocates its own so it cannot clobber the array this frame is
    // iterating. The flag is a separate boolean rather than nulling
    // _notifyScratch, which would make that field polymorphic (array|null)
    // and measured ~35% slower. No try/finally either — unwinding it per
    // dispatch cost ~13%, and a throwing subscriber only forfeits buffer
    // reuse, never correctness.
    const reentrant = this._notifyBusy;
    let buf: Subscriber<T>[];
    if (reentrant) {
      buf = new Array<Subscriber<T>>(n);
    } else {
      buf = this._notifyScratch;
      if (buf.length < n) buf = this._notifyScratch = new Array<Subscriber<T>>(n);
      this._notifyBusy = true;
    }
    for (let i = 0; i < n; i++) buf[i] = subs[i]!;
    for (let i = 0; i < n; i++) buf[i]!(this._value, prev);
    if (!reentrant) this._notifyBusy = false;
  }

  /**
   * Clear persisted data and reset to a value.
   *
   * Resets first so subscribers observe the new value, then removes the key
   * and cancels any debounced write. Doing it the other way round left the
   * queued microtask to re-create the key one tick later, so `clear()` only
   * appeared to work when `resetTo` happened to equal the current value (which
   * made the inner `set()` a no-op that scheduled nothing).
   */
  clear(resetTo: T): void {
    this.set(resetTo);
    if (this._key && this._storage) {
      this._storage.remove(this._key);
      if (this._persistScheduled) this._persistCancelled = true;
    }
  }

  /** Swap the storage medium at runtime (e.g. upgrade from local to remote) */
  swapStorage(persist: PersistOptions): void {
    // Persist current value to new storage
    this._key = persist.key;
    this._storage = persist.storage;
    // Without this, _persists stays false for a Reactive constructed without
    // persistence, so set() never schedules a write and the value is stored
    // exactly once here and then drifts forever.
    this._persists = true;
    this._persistCancelled = false;
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
