/**
 * Loom — Store decorators (TC39 Stage 3)
 *
 * @reactive — Internal reactive state backed by Reactive<T> (auto-accessor)
 * @prop     — External attribute with optional route binding (auto-accessor)
 * @computed — Cached derived getter
 * @store    — Component-scoped reactive store (auto-accessor)
 * @persist  — Single-value persistent accessor (auto-accessor)
 */

import { REACTIVES, WATCHERS, EMITTERS, COMPUTED_DIRTY, ROUTE_PROPS, localSymbol } from "../decorators/symbols.js";
import { Reactive } from "./reactive.js";
import { bus } from "../bus.js";
import type { PersistOptions, StorageAdapter } from "./storage.js";
import { LocalAdapter } from "./storage.js";
import { writeQueryParam, isRouteSyncing } from "../query-sync.js";
import type { Schedulable } from "../element/element.js";

/**
 * Staging area for @prop registrations.
 * TC39 member decorators evaluate before class decorators,
 * so @prop pushes here and @component flushes it.
 */
export const pendingProps: Array<{ key: string }> = [];

// ── Route sentinels ──

/** Sentinel for full route-param decompose: `@prop({params}) accessor p!: MyType` */
export const params = Symbol("loom:sentinel:params");

/** Sentinel for full query-param decompose: `@prop({query}) accessor q!: MyType` */
export const routeQuery = Symbol("loom:sentinel:query");

/** Sentinel for full route-meta decompose: `@prop({meta: routeMeta}) accessor m!: Record<string, unknown>` */
export const routeMeta = Symbol("loom:sentinel:meta");

/**
 * Internal reactive state. Auto-accessor backed by Reactive<T>.
 * Changes schedule batched `update()` via microtask.
 *
 * ```ts
 * @reactive accessor count = 0;
 * ```
 */
export function reactive<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const key = String(context.name);
  const storage = localSymbol<Reactive<V>>(`reactive:${key}`);

  // Store field name for LoomElement introspection
  context.addInitializer(function () {
    const ctor = this!.constructor as object;
    const fields = REACTIVES.ownArray<string>(ctor);
    if (!fields.includes(key)) fields.push(key);
  });

  return {
    get(this: This): V {
      const self = this as unknown as Record<symbol, unknown> & Record<string, unknown>;
      // Eagerly create the Reactive on first read so recordRead() fires
      // during traced update() calls — ensures this dep is tracked.
      if (!self[storage.key]) {
        const backingValue = target.get.call(this) as V;
        const r = new Reactive(backingValue);
        self[storage.key] = r;
        r.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());

        // Wire @watch handlers (WATCHERS is populated because method
        // addInitializer runs BEFORE accessor field init in TC39)
        const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
        if (watchers) {
          for (let i = 0; i < watchers.length; i++) {
            const w = watchers[i];
            if (w.field === key) r.subscribe((v: V, prev: V) => (self[w.key] as Function)(v, prev));
          }
        }

        // Wire @emit handlers
        const emitters = EMITTERS.from(self) as Array<{ field: string; factory: (v: V) => object }> | undefined;
        if (emitters) {
          for (let i = 0; i < emitters.length; i++) {
            const e = emitters[i];
            if (e.field === key) r.subscribe((v: V) => bus.emit(e.factory(v) as import("../event.js").LoomEvent));
          }
        }
      }
      return (self[storage.key] as Reactive<V>).value;
    },
    set(this: This, val: V) {
      const self = this as unknown as Record<symbol, unknown> & Record<string, unknown>;
      // Ensure Reactive exists (getter may not have run yet,
      // e.g. attributeChangedCallback before connectedCallback)
      if (!self[storage.key]) void (self[key]);
      (self[storage.key] as Reactive<V>).set(val);
    },
    init(this: This, _val: V): V {
      return _val;
    },
  };
}

// ── Route binding metadata ──

interface RouteBinding {
  propKey: string;
  param?: string | symbol;
  params?: symbol;
  query?: string | symbol;
  meta?: string | symbol;
  sync?: QuerySync;
}

/**
 * How a query-bound prop writes itself back to the address bar.
 *
 * `@prop({ query })` was one-way: the URL set the property and nothing put it
 * back. So a filter or a page number rendered correctly and then the URL no
 * longer described what was on screen -- refresh, share and bookmark all lost
 * it, and Back did not undo a filter change.
 */
export interface QuerySyncOptions {
  /**
   * `replace` (default) rewrites the current entry; `push` adds one.
   *
   * Replace is right for anything that changes as fast as a user can think --
   * a search box on push means one Back press per keystroke. Push is for a
   * change the user would expect Back to undo, like a page number.
   */
  history?: "replace" | "push";
  /**
   * Wait this many ms after the last write before touching the URL.
   *
   * For a text input this is the difference between one history operation and
   * one per keystroke.
   */
  debounce?: number;
  /**
   * Write the key even when the value equals the property's declared default
   * (default: false).
   *
   * Off, `page = 1` on `accessor page = 1` leaves the URL clean, and a
   * pristine view has a pristine address bar.
   */
  includeDefault?: boolean;
}

type QuerySync = true | QuerySyncOptions;

/**
 * Route options for `@prop`.
 *
 * A discriminated union rather than one bag of optional keys, so `sync` is
 * only reachable where it means something. It writes a *query* key back to the
 * URL -- a path param cannot be written without changing the route, and route
 * meta is static config -- so the type refuses it anywhere else instead of
 * leaving it to be ignored at runtime.
 */
type PropRouteOpts =
  | { param: string; params?: never; query?: never; meta?: never; sync?: never }
  | { params: symbol; param?: never; query?: never; meta?: never; sync?: never }
  | { meta: string | symbol; param?: never; params?: never; query?: never; sync?: never }
  /** The whole query object. Two-way would mean diffing it; not supported. */
  | { query: symbol; param?: never; params?: never; meta?: never; sync?: never }
  /** A single query key -- the only binding that can be written back. */
  | { query: string; sync?: QuerySync; param?: never; params?: never; meta?: never };

/**
 * External attribute. Observed HTML attribute that auto-parses from strings.
 * Uses @reactive under the hood.
 *
 * Bare decorator:
 * ```ts
 * @prop accessor label = "Count";
 * ```
 *
 * Route param injection:
 * ```ts
 * @prop({ param: "id" }) accessor userId!: string;
 * @prop({params}) accessor params!: MyParamType;
 * ```
 */

/** Per-instance state for a synced query prop. */
const SYNC_STATE = localSymbol<Map<string, { timer: unknown; initial: unknown }>>("querySync");

/**
 * Wrap a reactive accessor so writing it also writes the address bar.
 *
 * Only the one query key is touched, so two synced props on a page do not
 * clobber each other. The value is compared against what the property was
 * declared with -- a prop sitting at its default writes nothing, which is what
 * keeps a pristine view on a pristine URL.
 */
function wrapQuerySync<T extends object, V>(
  base: ClassAccessorDecoratorResult<T, V>,
  propKey: string,
  queryKey: string,
  sync: QuerySync,
): ClassAccessorDecoratorResult<T, V> {
  const opts: QuerySyncOptions = sync === true ? {} : sync;
  const history = opts.history ?? "replace";
  const debounce = opts.debounce ?? 0;

  const stateFor = (host: object) => {
    let map = SYNC_STATE.from(host);
    if (!map) SYNC_STATE.set(host, (map = new Map()));
    let entry = map.get(propKey);
    if (!entry) map.set(propKey, (entry = { timer: null, initial: undefined }));
    return entry;
  };

  const write = (host: object, value: V) => {
    const entry = stateFor(host);
    const atDefault = !opts.includeDefault && Object.is(value, entry.initial);
    // null removes the key; a default-valued prop should leave no trace.
    const encoded =
      atDefault || value === undefined || value === null || value === ""
        ? null
        : String(value);

    const send = () => writeQueryParam(queryKey, encoded, history);
    if (debounce > 0) {
      if (entry.timer !== null) clearTimeout(entry.timer as ReturnType<typeof setTimeout>);
      entry.timer = setTimeout(send, debounce);
    } else {
      send();
    }
  };

  return {
    get(this: T) {
      return base.get!.call(this);
    },
    set(this: T, value: V) {
      base.set!.call(this, value);
      // The outlet writes route data straight onto the property during
      // resolution. Echoing that back would fight the navigation that caused
      // it, so a write originating from the URL is skipped.
      if (!isRouteSyncing()) write(this, value);
    },
    init(this: T, value: V) {
      // Captured before any URL injection, so "is this the default" means the
      // value the class declared, not whatever the first URL happened to set.
      stateFor(this).initial = value;
      return base.init ? base.init.call(this, value) : value;
    },
  };
}

export function prop<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V>;
export function prop(opts: PropRouteOpts): <This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
) => ClassAccessorDecoratorResult<This, V>;
export function prop<This extends object, V>(
  targetOrOpts: ClassAccessorDecoratorTarget<This, V> | PropRouteOpts,
  context?: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> | ((
  target: ClassAccessorDecoratorTarget<This, V>,
  ctx: ClassAccessorDecoratorContext<This, V>,
) => ClassAccessorDecoratorResult<This, V>) {
  // Bare @prop — auto-accessor decorator applied directly
  if (context) {
    const key = String(context.name);
    const result = reactive(targetOrOpts as ClassAccessorDecoratorTarget<This, V>, context);

    // Stage for @component to flush at class-decoration time
    pendingProps.push({ key });

    return result;
  }

  // @prop({ param: "id" }) — returns decorator factory
  const opts = targetOrOpts as PropRouteOpts;
  return <T2 extends object, V2>(
    target: ClassAccessorDecoratorTarget<T2, V2>,
    ctx: ClassAccessorDecoratorContext<T2, V2>,
  ): ClassAccessorDecoratorResult<T2, V2> => {
    const propKey = String(ctx.name);
    const base = reactive(
      target as unknown as ClassAccessorDecoratorTarget<T2, V2>,
      ctx,
    );

    // Two-way for `@prop({ query: "k", sync })`. Everything else keeps the
    // reactive accessor untouched, so nothing that exists today changes shape.
    const syncKey = typeof opts.query === "string" && opts.sync ? opts.query : null;
    const result = syncKey === null ? base : wrapQuerySync(base, propKey, syncKey, opts.sync!);

    // Store route binding metadata
    ctx.addInitializer(function () {
      const ctor = (this as object & { constructor: object }).constructor;
      const bindings = ROUTE_PROPS.ownArray<RouteBinding>(ctor);
      // addInitializer runs per INSTANCE — without this guard the array grows
      // by one duplicate binding for every element constructed, and the outlet
      // re-injects each of them on every navigation.
      if (bindings.some((b) => b.propKey === propKey)) return;

      const binding: RouteBinding = { propKey };
      if (opts.params) binding.params = opts.params;
      if (opts.param) binding.param = opts.param;
      if (opts.query) binding.query = opts.query;
      if (opts.meta) binding.meta = opts.meta;
      if (opts.sync) binding.sync = opts.sync;
      bindings.push(binding);
    });

    return result;
  };
}

/**
 * Cached derived value. Re-computed only when reactive dependencies fire.
 *
 * ```ts
 * @computed
 * get displayName() { return `${this.firstName} ${this.lastName}`; }
 * ```
 */
export function computed<This extends object, V>(
  target: (this: This) => V,
  context: ClassGetterDecoratorContext<This, V>,
): (this: This) => V {
  const key = String(context.name);
  const cache = localSymbol<V>(`computed:${key}`);
  const dirty = localSymbol<boolean>(`computed:dirty:${key}`);

  // Track dirty key for scheduleUpdate invalidation
  context.addInitializer(function () {
    const proto = ((this as object & { constructor: { prototype: object } }).constructor).prototype;
    const keys = COMPUTED_DIRTY.ownArray<symbol>(proto);
    if (!keys.includes(dirty.key)) keys.push(dirty.key);
  });

  return function (this: This): V {
    const self = this as unknown as Record<symbol, V | boolean>;
    if (self[dirty.key] !== false) {
      self[cache.key] = target.call(this);
      self[dirty.key] = false;
    }
    return self[cache.key] as V;
  };
}

// ── @store decorator ──

/**
 * Create a deep proxy that intercepts mutations and notifies the Reactive.
 * Snapshots prev value before mutation for accurate watcher callbacks.
 */
function createDeepProxy<T extends object>(
  obj: T,
  reactive: Reactive<T>,
  onBeforeMutate?: () => void,
): T {
  const proxyCache = new WeakMap<object, unknown>();

  function wrap(target: unknown): unknown {
    if (target === null || typeof target !== "object") return target;
    if (proxyCache.has(target as object)) return proxyCache.get(target as object);

    const proxy = new Proxy(target as object, {
      get(t, p, receiver) {
        // Skip symbol properties (internal) — fast path
        if (typeof p === "symbol") return Reflect.get(t, p, receiver);
        const value = Reflect.get(t, p, receiver);
        // Only wrap objects/arrays — primitives (the common case) skip proxy overhead
        if (value !== null && typeof value === "object") {
          return wrap(value);
        }
        return value;
      },
      set(t, p, value, receiver) {
        onBeforeMutate?.();
        const result = Reflect.set(t, p, value, receiver);
        reactive.notify();
        return result;
      },
      deleteProperty(t, p) {
        onBeforeMutate?.();
        const result = Reflect.deleteProperty(t, p);
        reactive.notify();
        return result;
      },
    });

    proxyCache.set(target as object, proxy);
    return proxy;
  }

  return wrap(obj) as T;
}

/**
 * Build the accessor descriptor shared by both bare and factory forms.
 */
function buildStoreAccessor<This extends object, T extends object>(
  defaults: T,
  persist: PersistOptions | undefined,
  key: string,
): ClassAccessorDecoratorResult<This, T> {
  const reactive_ = localSymbol<Reactive<T>>(`store:${key}`);
  const proxy_ = localSymbol<T>(`store:proxy:${key}`);
  const defaults_ = localSymbol<T>(`store:defaults:${key}`);
  const prev_ = localSymbol<T>(`store:prev:${key}`);

  function initStore(self: Record<symbol | string, unknown>, initialValue: T) {
    const r = new Reactive<T>(initialValue, persist);
    self[reactive_.key] = r;
    self[defaults_.key] = defaults;
    r.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());

    // Wire @watch handlers — same pattern as @reactive
    const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
    if (watchers) {
      for (let i = 0; i < watchers.length; i++) {
        const w = watchers[i];
        if (w.field === key) {
          r.subscribe((v: T, prev: T) => {
            // Use the snapshot if available for accurate prev
            const actualPrev = (self[prev_.key] as T | undefined) ?? prev;
            (self[w.key] as Function)(v, actualPrev);
            self[prev_.key] = undefined;
          });
        }
      }
    }

    // Wire @emit handlers
    const emitters = EMITTERS.from(self) as Array<{ field: string; factory: (v: T) => object }> | undefined;
    if (emitters) {
      for (let i = 0; i < emitters.length; i++) {
        const e = emitters[i];
        if (e.field === key) r.subscribe((v: T) => bus.emit(e.factory(v) as import("../event.js").LoomEvent));
      }
    }

    // Snapshot callback — only needed when watchers exist for this field.
    // Without watchers, skip the structuredClone on every mutation.
    const hasWatchers = watchers?.some(w => w.field === key) ?? false;
    const onBeforeMutate = hasWatchers ? () => {
      if (self[prev_.key] === undefined) {
        try {
          self[prev_.key] = structuredClone(r.peek());
        } catch {
          // Fallback for non-cloneable values
          self[prev_.key] = r.peek();
        }
      }
    } : undefined;

    self[proxy_.key] = createDeepProxy(r.value, r, onBeforeMutate);

    // Inject $reset method on the instance
    const resetName = `$reset_${key}`;
    (self as Record<string, unknown>)[resetName] = () => {
      const fresh = structuredClone(defaults);
      (self[reactive_.key] as Reactive<T>).set(fresh);
      self[proxy_.key] = createDeepProxy(
        (self[reactive_.key] as Reactive<T>).value,
        self[reactive_.key] as Reactive<T>,
        onBeforeMutate,
      );
    };
  }

  return {
    get(this: This): T {
      const self = this as unknown as Record<symbol | string, unknown>;
      if (!self[reactive_.key]) {
        const initial = structuredClone(defaults);
        initStore(self, initial);
      }
      // Touch Reactive.value so recordRead() fires during traced update()
      (self[reactive_.key] as Reactive<T>).value;
      return self[proxy_.key] as T;
    },
    set(this: This, val: T) {
      const self = this as unknown as Record<symbol | string, unknown>;
      if (!self[reactive_.key]) {
        initStore(self, val);
      } else {
        (self[reactive_.key] as Reactive<T>).set(val);

        // Snapshot callback for the new proxy
        const onBeforeMutate = () => {
          if (self[prev_.key] === undefined) {
            try {
              self[prev_.key] = structuredClone((self[reactive_.key] as Reactive<T>).peek());
            } catch {
              self[prev_.key] = (self[reactive_.key] as Reactive<T>).peek();
            }
          }
        };

        self[proxy_.key] = createDeepProxy(
          (self[reactive_.key] as Reactive<T>).value,
          self[reactive_.key] as Reactive<T>,
          onBeforeMutate,
        );
      }
    },
  };
}

/**
 * Component-scoped reactive store (auto-accessor).
 *
 * Bare decorator — uses the accessor's initializer as defaults:
 * ```ts
 * @store accessor state: TodoState = { items: [], filter: "all" };
 * ```
 *
 * Factory form — explicit defaults and optional persistence:
 * ```ts
 * @store<TodoState>({ items: [], filter: "all" })
 * accessor state!: TodoState;
 *
 * @store<TodoState>({ items: [], filter: "all" }, { key: "todos", storage })
 * accessor state!: TodoState;
 * ```
 *
 * Instances get a `$reset_<field>()` method to restore defaults:
 * ```ts
 * this.$reset_state();
 * ```
 */

// Bare decorator form
export function store<This extends object, T extends object>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
): ClassAccessorDecoratorResult<This, T>;

// Factory form
export function store<T extends object>(
  defaults: T,
  persist?: PersistOptions,
): <This extends object>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
) => ClassAccessorDecoratorResult<This, T>;

export function store<This extends object, T extends object>(
  targetOrDefaults: ClassAccessorDecoratorTarget<This, T> | T,
  contextOrPersist?: ClassAccessorDecoratorContext<This, T> | PersistOptions,
): ClassAccessorDecoratorResult<This, T> | (<This2 extends object>(
  target: ClassAccessorDecoratorTarget<This2, T>,
  context: ClassAccessorDecoratorContext<This2, T>,
) => ClassAccessorDecoratorResult<This2, T>) {

  // Bare @store — context is present
  if (contextOrPersist && typeof (contextOrPersist as ClassAccessorDecoratorContext<This, T>).name !== "undefined"
    && typeof (contextOrPersist as ClassAccessorDecoratorContext<This, T>).addInitializer === "function") {
    const context = contextOrPersist as ClassAccessorDecoratorContext<This, T>;
    const key = String(context.name);

    // For bare form, we need the init value. We wrap init to capture it,
    // then build the accessor with those defaults.
    const reactive_ = localSymbol<Reactive<T>>(`store:${key}`);
    const proxy_ = localSymbol<T>(`store:proxy:${key}`);
    const defaults_ = localSymbol<T>(`store:defaults:${key}`);
    const prev_ = localSymbol<T>(`store:prev:${key}`);

    // We can't call buildStoreAccessor yet because we don't have defaults.
    // Instead, inline the logic and capture defaults from init().
    return {
      init(this: This, value: T): T {
        // Stash defaults on the instance for $reset
        const self = this as unknown as Record<symbol | string, unknown>;
        self[defaults_.key] = structuredClone(value);
        return value;
      },
      get(this: This): T {
        const self = this as unknown as Record<symbol | string, unknown>;
        if (!self[reactive_.key]) {
          // Use the init value (already stored via init()) as defaults
          const defaults = self[defaults_.key] as T;
          const initial = structuredClone(defaults);
          const r = new Reactive<T>(initial);
          self[reactive_.key] = r;
          r.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());

          // Wire @watch
          const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
          if (watchers) {
            for (let i = 0; i < watchers.length; i++) {
              const w = watchers[i];
              if (w.field === key) {
                r.subscribe((v: T, prev: T) => {
                  const actualPrev = (self[prev_.key] as T | undefined) ?? prev;
                  (self[w.key] as Function)(v, actualPrev);
                  self[prev_.key] = undefined;
                });
              }
            }
          }

          // Wire @emit
          const emitters = EMITTERS.from(self) as Array<{ field: string; factory: (v: T) => object }> | undefined;
          if (emitters) {
            for (let i = 0; i < emitters.length; i++) {
              const e = emitters[i];
              if (e.field === key) r.subscribe((v: T) => bus.emit(e.factory(v) as import("../event.js").LoomEvent));
            }
          }

          const hasWatchers = watchers?.some(w => w.field === key) ?? false;
          const onBeforeMutate = hasWatchers ? () => {
            if (self[prev_.key] === undefined) {
              try { self[prev_.key] = structuredClone(r.peek()); }
              catch { self[prev_.key] = r.peek(); }
            }
          } : undefined;

          self[proxy_.key] = createDeepProxy(r.value, r, onBeforeMutate);

          // $reset method
          (self as Record<string, unknown>)[`$reset_${key}`] = () => {
            const fresh = structuredClone(defaults);
            (self[reactive_.key] as Reactive<T>).set(fresh);
            self[proxy_.key] = createDeepProxy(
              (self[reactive_.key] as Reactive<T>).value,
              self[reactive_.key] as Reactive<T>,
              onBeforeMutate,
            );
          };
        }
        (self[reactive_.key] as Reactive<T>).value;
        return self[proxy_.key] as T;
      },
      set(this: This, val: T) {
        const self = this as unknown as Record<symbol | string, unknown>;
        if (!self[reactive_.key]) {
          // Trigger getter to init, then set
          void (this as unknown as Record<string, T>)[key];
        }
        (self[reactive_.key] as Reactive<T>).set(val);
        const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
        const hasWatchers = watchers?.some(w => w.field === key) ?? false;
        const onBeforeMutate = hasWatchers ? () => {
          if (self[prev_.key] === undefined) {
            try { self[prev_.key] = structuredClone((self[reactive_.key] as Reactive<T>).peek()); }
            catch { self[prev_.key] = (self[reactive_.key] as Reactive<T>).peek(); }
          }
        } : undefined;
        self[proxy_.key] = createDeepProxy(
          (self[reactive_.key] as Reactive<T>).value,
          self[reactive_.key] as Reactive<T>,
          onBeforeMutate,
        );
      },
    };
  }

  // Factory form — @store<T>(defaults, persist?)
  const defaults = targetOrDefaults as T;
  const persist = contextOrPersist as PersistOptions | undefined;

  return <This2 extends object>(
    _target: ClassAccessorDecoratorTarget<This2, T>,
    context: ClassAccessorDecoratorContext<This2, T>,
  ): ClassAccessorDecoratorResult<This2, T> => {
    const key = String(context.name);
    return buildStoreAccessor<This2, T>(defaults, persist, key);
  };
}

// ── @persist decorator ──

/** Lazy singleton — only allocated when @persist is actually used */
let _defaultStorage: StorageAdapter | null = null;
function getDefaultStorage(): StorageAdapter {
  return _defaultStorage ??= new LocalAdapter();
}

interface PersistDecoratorOpts {
  key?: string;
  storage?: StorageAdapter;
}

/**
 * Single-value persistent auto-accessor.
 *
 * Backed by `Reactive<T>` with `PersistOptions` — same hydration,
 * JSON round-trip, and debounced write-through as `@store`.
 *
 * ```ts
 * // localStorage key = "theme"
 * @persist accessor theme = "dark";
 *
 * // Explicit key
 * @persist("user-theme") accessor theme = "dark";
 *
 * // Custom adapter
 * @persist({ storage: new SessionAdapter() }) accessor theme = "dark";
 *
 * // Custom key + adapter
 * @persist({ key: "user-theme", storage: new SessionAdapter() }) accessor theme = "dark";
 * ```
 */

// Bare — @persist accessor x = val
export function persist<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V>;

// String key — @persist("key") accessor x = val
export function persist(key: string): <This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
) => ClassAccessorDecoratorResult<This, V>;

// Options — @persist({ key?, storage? }) accessor x = val
export function persist(opts: PersistDecoratorOpts): <This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
) => ClassAccessorDecoratorResult<This, V>;

export function persist<This extends object, V>(
  targetOrKeyOrOpts: ClassAccessorDecoratorTarget<This, V> | string | PersistDecoratorOpts,
  context?: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> | (<T2 extends object, V2>(
  target: ClassAccessorDecoratorTarget<T2, V2>,
  context: ClassAccessorDecoratorContext<T2, V2>,
) => ClassAccessorDecoratorResult<T2, V2>) {

  // Bare @persist — context is present
  if (context) {
    return buildPersistAccessor<This, V>(String(context.name), getDefaultStorage(), context);
  }

  // @persist("key") — string
  if (typeof targetOrKeyOrOpts === "string") {
    const explicitKey = targetOrKeyOrOpts;
    return <T2 extends object, V2>(
      _target: ClassAccessorDecoratorTarget<T2, V2>,
      ctx: ClassAccessorDecoratorContext<T2, V2>,
    ): ClassAccessorDecoratorResult<T2, V2> => {
      return buildPersistAccessor<T2, V2>(explicitKey, getDefaultStorage(), ctx);
    };
  }

  // @persist({ key?, storage? }) — options object
  const opts = targetOrKeyOrOpts as PersistDecoratorOpts;
  return <T2 extends object, V2>(
    _target: ClassAccessorDecoratorTarget<T2, V2>,
    ctx: ClassAccessorDecoratorContext<T2, V2>,
  ): ClassAccessorDecoratorResult<T2, V2> => {
    const storageKey = opts.key ?? String(ctx.name);
    const adapter = opts.storage ?? getDefaultStorage();
    return buildPersistAccessor<T2, V2>(storageKey, adapter, ctx);
  };
}

/** @internal — builds the accessor descriptor for @persist */
function buildPersistAccessor<This extends object, V>(
  storageKey: string,
  adapter: StorageAdapter,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const fieldName = String(context.name);
  const sym = localSymbol<Reactive<V>>(`persist:${fieldName}`);
  const persistOpts: PersistOptions = { key: storageKey, storage: adapter };

  return {
    get(this: This): V {
      const self = this as unknown as Record<symbol | string, unknown>;
      if (!self[sym.key]) {
        // First access — create Reactive with persistence.
        // If storage has a value, Reactive hydrates from it; otherwise uses init.
        const initial = (self as any)[`__persist_init_${fieldName}`] as V;
        const r = new Reactive<V>(initial, persistOpts);
        self[sym.key] = r;
        r.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());

        // Wire @watch handlers
        const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
        if (watchers) {
          for (let i = 0; i < watchers.length; i++) {
            const w = watchers[i];
            if (w.field === fieldName) r.subscribe((v: V, prev: V) => (self[w.key] as Function)(v, prev));
          }
        }

        // Wire @emit handlers
        const emitters = EMITTERS.from(self) as Array<{ field: string; factory: (v: V) => object }> | undefined;
        if (emitters) {
          for (let i = 0; i < emitters.length; i++) {
            const e = emitters[i];
            if (e.field === fieldName) r.subscribe((v: V) => bus.emit(e.factory(v) as import("../event.js").LoomEvent));
          }
        }
      }
      return (self[sym.key] as Reactive<V>).value;
    },
    set(this: This, val: V) {
      const self = this as unknown as Record<symbol | string, unknown>;
      if (!self[sym.key]) void (self as unknown as Record<string, V>)[fieldName];
      (self[sym.key] as Reactive<V>).set(val);
    },
    init(this: This, val: V): V {
      // Stash the init value so the getter can use it as fallback
      (this as any)[`__persist_init_${fieldName}`] = val;
      return val;
    },
  };
}

