/**
 * Loom — Store decorators (TC39 Stage 3)
 *
 * @reactive — Internal reactive state backed by Reactive<T> (auto-accessor)
 * @prop     — External attribute with optional route binding (auto-accessor)
 * @computed — Cached derived getter
 * @store    — Component-scoped reactive store (auto-accessor)
 */

import { REACTIVES, PROPS, WATCHERS, EMITTERS, COMPUTED_DIRTY, ROUTE_PROPS, TRANSFORMS, localSymbol } from "../decorators/symbols";
import { Reactive } from "./reactive";
import { bus } from "../bus";
import type { PersistOptions } from "./storage";
import type { Schedulable } from "../element/element";

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
    const existing = REACTIVES.from(ctor) as string[] | undefined;
    if (!existing) REACTIVES.set(ctor, [key]);
    else if (!existing.includes(key)) existing.push(key);
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
            if (e.field === key) r.subscribe((v: V) => bus.emit(e.factory(v) as import("../event").LoomEvent));
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
}

type PropRouteOpts = {
  param?: string;
  params?: symbol;
  query?: string | symbol;
  meta?: string | symbol;
};

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
    const result = reactive(
      target as unknown as ClassAccessorDecoratorTarget<T2, V2>,
      ctx,
    );

    // Store route binding metadata
    ctx.addInitializer(function () {
      const ctor = (this as object & { constructor: object }).constructor;
      const existing = ROUTE_PROPS.from(ctor) as RouteBinding[] | undefined;

      const binding: RouteBinding = { propKey };
      if (opts.params) binding.params = opts.params;
      if (opts.param) binding.param = opts.param;
      if (opts.query) binding.query = opts.query;
      if (opts.meta) binding.meta = opts.meta;
      if (!existing) ROUTE_PROPS.set(ctor, [binding]);
      else existing.push(binding);
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
    const existing = COMPUTED_DIRTY.from(proto) as symbol[] | undefined;
    if (!existing) COMPUTED_DIRTY.set(proto, [dirty.key]);
    else if (!existing.includes(dirty.key)) existing.push(dirty.key);
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
        const value = Reflect.get(t, p, receiver);
        if (value !== null && typeof value === "object" && typeof p !== "symbol") {
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
        if (e.field === key) r.subscribe((v: T) => bus.emit(e.factory(v) as import("../event").LoomEvent));
      }
    }

    // Snapshot callback — called by deep proxy before mutation
    const onBeforeMutate = () => {
      if (self[prev_.key] === undefined) {
        try {
          self[prev_.key] = structuredClone(r.peek());
        } catch {
          // Fallback for non-cloneable values
          self[prev_.key] = r.peek();
        }
      }
    };

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
              if (e.field === key) r.subscribe((v: T) => bus.emit(e.factory(v) as import("../event").LoomEvent));
            }
          }

          const onBeforeMutate = () => {
            if (self[prev_.key] === undefined) {
              try { self[prev_.key] = structuredClone(r.peek()); }
              catch { self[prev_.key] = r.peek(); }
            }
          };

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
        const onBeforeMutate = () => {
          if (self[prev_.key] === undefined) {
            try { self[prev_.key] = structuredClone((self[reactive_.key] as Reactive<T>).peek()); }
            catch { self[prev_.key] = (self[reactive_.key] as Reactive<T>).peek(); }
          }
        };
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
