/**
 * Loom — Store decorators (TC39 Stage 3)
 *
 * @reactive — Internal reactive state backed by Reactive<T> (auto-accessor)
 * @prop     — External attribute with optional route binding (auto-accessor)
 * @computed — Cached derived getter
 * @store    — Component-scoped reactive store (auto-accessor)
 */

import { REACTIVES, PROPS, WATCHERS, EMITTERS, COMPUTED_DIRTY, ROUTE_PROPS, TRANSFORMS } from "../decorators/symbols";
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
  const storageKey = Symbol(key);

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
      if (!self[storageKey]) {
        const backingValue = target.get.call(this) as V;
        const r = new Reactive(backingValue);
        self[storageKey] = r;
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
      return (self[storageKey] as Reactive<V>).value;
    },
    set(this: This, val: V) {
      const self = this as unknown as Record<symbol, unknown> & Record<string, unknown>;
      // Ensure Reactive exists (getter may not have run yet,
      // e.g. attributeChangedCallback before connectedCallback)
      if (!self[storageKey]) void (self[key]);
      (self[storageKey] as Reactive<V>).set(val);
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
  const cacheKey = Symbol(`computed:${key}`);
  const dirtyKey = Symbol(`dirty:${key}`);

  // Track dirty key for scheduleUpdate invalidation
  context.addInitializer(function () {
    const proto = ((this as object & { constructor: { prototype: object } }).constructor).prototype;
    const existing = COMPUTED_DIRTY.from(proto) as symbol[] | undefined;
    if (!existing) COMPUTED_DIRTY.set(proto, [dirtyKey]);
    else if (!existing.includes(dirtyKey)) existing.push(dirtyKey);
  });

  return function (this: This): V {
    const self = this as unknown as Record<symbol, V | boolean>;
    if (self[dirtyKey] !== false) {
      self[cacheKey] = target.call(this);
      self[dirtyKey] = false;
    }
    return self[cacheKey] as V;
  };
}

// ── @store decorator ──

const STORE_META = Symbol("loom:store:meta");

interface StoreMeta {
  key: string;
  defaults: unknown;
  persist?: PersistOptions;
}

/**
 * Create a deep proxy that intercepts mutations and notifies the Reactive.
 */
function createDeepProxy<T extends object>(
  obj: T,
  reactive: Reactive<T>,
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
        const result = Reflect.set(t, p, value, receiver);
        reactive.notify();
        return result;
      },
      deleteProperty(t, p) {
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
 * Component-scoped reactive store with optional persistence (auto-accessor).
 *
 * ```ts
 * @store<TodoState>({ items: [], filter: "all" })
 * accessor state!: TodoState;
 * ```
 */
export function store<T extends object>(
  defaults: T,
  persist?: PersistOptions,
) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, T>,
    context: ClassAccessorDecoratorContext<This, T>,
  ): ClassAccessorDecoratorResult<This, T> => {
    const key = String(context.name);
    const reactiveKey = Symbol(`store:${key}`);
    const proxyKey = Symbol(`store:proxy:${key}`);

    return {
      get(this: This): T {
        const self = this as unknown as Record<symbol, unknown>;
        if (!self[reactiveKey]) {
          const initial = JSON.parse(JSON.stringify(defaults));
          const r = new Reactive<T>(initial, persist);
          self[reactiveKey] = r;
          r.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());
          self[proxyKey] = createDeepProxy(r.value, r);
        }
        // Touch Reactive.value so recordRead() fires during traced update()
        (self[reactiveKey] as Reactive<T>).value;
        return self[proxyKey] as T;
      },
      set(this: This, val: T) {
        const self = this as unknown as Record<symbol, unknown>;
        if (!self[reactiveKey]) {
          const r = new Reactive<T>(val, persist);
          self[reactiveKey] = r;
          r.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());
          self[proxyKey] = createDeepProxy(r.value, r);
        } else {
          (self[reactiveKey] as Reactive<T>).set(val);
          self[proxyKey] = createDeepProxy((self[reactiveKey] as Reactive<T>).value, self[reactiveKey] as Reactive<T>);
        }
      },
    };
  };
}
