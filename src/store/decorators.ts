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
  context.addInitializer(function (this: any) {
    if (!this.constructor[REACTIVES]) this.constructor[REACTIVES] = [];
    if (!this.constructor[REACTIVES].includes(key)) {
      this.constructor[REACTIVES].push(key);
    }
  });

  return {
    get(this: any): V {
      // Eagerly create the Reactive on first read so recordRead() fires
      // during traced update() calls — ensures this dep is tracked.
      if (!this[storageKey]) {
        const backingValue = target.get.call(this) as V;
        const r = new Reactive(backingValue);
        this[storageKey] = r;
        r.subscribe(() => this.scheduleUpdate?.());

        // Wire @watch handlers (WATCHERS is populated because method
        // addInitializer runs BEFORE accessor field init in TC39)
        for (const w of (this[WATCHERS] ?? []).filter(
          (w: { field: string }) => w.field === key,
        )) {
          r.subscribe((v: V, prev: V) => this[w.key](v, prev));
        }

        // Wire @emit handlers
        for (const e of (this[EMITTERS] ?? []).filter(
          (e: { field: string }) => e.field === key,
        )) {
          r.subscribe((v: V) => bus.emit(e.factory(v)));
        }
      }
      return (this[storageKey] as Reactive<V>).value;
    },
    set(this: any, val: V) {
      // Ensure Reactive exists (getter may not have run yet,
      // e.g. attributeChangedCallback before connectedCallback)
      if (!this[storageKey]) (this as any)[key];
      this[storageKey].set(val);
    },
    init(this: any, val: V): V {
      return val;
    },
  };
}

// ── Route binding metadata ──

interface RouteBinding {
  propKey: string;
  param?: string | symbol;
  params?: symbol;
  query?: string | symbol;
}

type PropRouteOpts = {
  param?: string;
  params?: symbol;
  query?: string | symbol;
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
    ctx.addInitializer(function (this: any) {
      const ctor = this.constructor;
      if (!ctor[ROUTE_PROPS]) ctor[ROUTE_PROPS] = [];

      const binding: RouteBinding = { propKey };
      if (opts.params) binding.params = opts.params;
      if (opts.param) binding.param = opts.param;
      if (opts.query) binding.query = opts.query;
      ctor[ROUTE_PROPS].push(binding);
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
  context.addInitializer(function (this: any) {
    if (!this.constructor.prototype[COMPUTED_DIRTY]) {
      this.constructor.prototype[COMPUTED_DIRTY] = [];
    }
    if (!this.constructor.prototype[COMPUTED_DIRTY].includes(dirtyKey)) {
      this.constructor.prototype[COMPUTED_DIRTY].push(dirtyKey);
    }
  });

  return function (this: any): V {
    if (this[dirtyKey] !== false) {
      this[cacheKey] = target.call(this);
      this[dirtyKey] = false;
    }
    return this[cacheKey];
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
      get(this: any): T {
        if (!this[reactiveKey]) {
          const initial = JSON.parse(JSON.stringify(defaults));
          const r = new Reactive<T>(initial, persist);
          this[reactiveKey] = r;
          r.subscribe(() => this.scheduleUpdate?.());
          this[proxyKey] = createDeepProxy(r.value, r);
        }
        // Touch Reactive.value so recordRead() fires during traced update()
        (this[reactiveKey] as Reactive<T>).value;
        return this[proxyKey];
      },
      set(this: any, val: T) {
        if (!this[reactiveKey]) {
          const r = new Reactive<T>(val, persist);
          this[reactiveKey] = r;
          r.subscribe(() => this.scheduleUpdate?.());
          this[proxyKey] = createDeepProxy(r.value, r);
        } else {
          this[reactiveKey].set(val);
          this[proxyKey] = createDeepProxy(this[reactiveKey].value, this[reactiveKey]);
        }
      },
    };
  };
}
