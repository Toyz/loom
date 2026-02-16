/**
 * Loom — Store decorators
 *
 * @reactive — Internal reactive state backed by Reactive<T>
 * @prop     — External attribute with optional route binding
 * @computed — Cached derived getter
 * @store    — Component-scoped reactive store with optional persistence
 */

import { REACTIVES, PROPS, WATCHERS, EMITTERS, COMPUTED_DIRTY, ROUTE_PROPS } from "../decorators/symbols";
import { Reactive } from "./reactive";
import { bus } from "../bus";
import type { PersistOptions } from "./storage";

// ── Route sentinels ──
// Used with @prop shorthand: @prop({params}) or @prop({query})

/** Sentinel for full route-param decompose: `@prop({params}) p!: MyType` */
export const params = Symbol("loom:sentinel:params");

/** Sentinel for full query-param decompose: `@prop({query}) q!: MyType` */
// NOTE: This is NOT the @query(".selector") DOM decorator — that's in element/decorators.
// This sentinel is re-exported from "@toyz/loom/router".
export const routeQuery = Symbol("loom:sentinel:query");

/**
 * Internal reactive state. Creates a getter/setter backed by Reactive<T>.
 * Changes schedule batched `update()` via microtask.
 *
 * ```ts
 * @reactive count = 0;
 * ```
 */
export function reactive(target: any, key: string): void {
  // Define-time: store field name and create getter/setter
  if (!target[REACTIVES]) target[REACTIVES] = [];
  target[REACTIVES].push(key);

  const storageKey = Symbol(key);

  Object.defineProperty(target, key, {
    get() {
      return (this[storageKey] as Reactive<any>)?.value;
    },
    set(val: any) {
      if (!this[storageKey]) {
        // First set (from field initializer)
        const r = new Reactive(val);
        this[storageKey] = r;
        r.subscribe(() => this.scheduleUpdate?.());

        // Wire @watch handlers for this field
        for (const w of (this[WATCHERS] ?? []).filter(
          (w: any) => w.field === key,
        )) {
          r.subscribe((v: any, prev: any) => this[w.key](v, prev));
        }

        // Wire @emit handlers for this field
        for (const e of (this[EMITTERS] ?? []).filter(
          (e: any) => e.field === key,
        )) {
          r.subscribe((v: any) => bus.emit(e.factory(v)));
        }
      } else {
        this[storageKey].set(val);
      }
    },
    enumerable: true,
    configurable: true,
  });
}

// ── Route binding metadata ──

interface RouteBinding {
  propKey: string;
  param?: string | symbol;   // string = single pick, symbol = full decompose
  params?: symbol;           // alias: full param decompose
  query?: string | symbol;   // string = single pick, symbol = full decompose
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
 * @prop label = "Count";   // <my-counter label="Clicks">
 * ```
 *
 * Route param injection:
 * ```ts
 * @prop({ param: "id" }) userId!: string;      // single param
 * @prop({params}) params!: MyParamType;         // full decompose
 * @prop({ query: "tab" }) activeTab!: string;   // single query param
 * @prop({query: routeQuery}) query!: MyQuery;   // full query decompose
 * ```
 */
export function prop(
  targetOrOpts: any,
  key?: any,
): any {
  if (typeof key === "string") {
    // Bare @prop — existing behavior
    _registerProp(targetOrOpts, key);
    return;
  }

  // @prop({ param: "id" }) or @prop({params}) etc.
  const opts = targetOrOpts as PropRouteOpts;
  return (target: any, propKey: string) => {
    // Store route binding metadata on the constructor
    const ctor = target.constructor;
    if (!ctor[ROUTE_PROPS]) ctor[ROUTE_PROPS] = [];

    const binding: RouteBinding = { propKey };
    if (opts.params) binding.params = opts.params;
    if (opts.param) binding.param = opts.param;
    if (opts.query) binding.query = opts.query;
    ctor[ROUTE_PROPS].push(binding);

    // Wire @reactive so changes trigger re-renders
    reactive(target, propKey);
  };
}

/** Register a bare @prop (attribute-observed reactive) */
function _registerProp(target: any, key: string): void {
  if (!target.constructor[PROPS]) target.constructor[PROPS] = new Map();
  target.constructor[PROPS].set(key.toLowerCase(), key);
  reactive(target, key);
}

/**
 * Cached derived value. Re-computed only when reactive dependencies fire.
 *
 * ```ts
 * @computed
 * get displayName() { return `${this.firstName} ${this.lastName}`; }
 * ```
 */
export function computed(
  target: any,
  key: string,
  desc: PropertyDescriptor,
): void {
  // Define-time: wrap getter with caching
  const getter = desc.get!;
  const cacheKey = Symbol(`computed:${key}`);
  const dirtyKey = Symbol(`dirty:${key}`);

  desc.get = function () {
    if ((this as any)[dirtyKey] !== false) {
      (this as any)[cacheKey] = getter.call(this);
      (this as any)[dirtyKey] = false;
    }
    return (this as any)[cacheKey];
  };

  // Track the dirty key so scheduleUpdate can dirty all computed properties
  if (!target[COMPUTED_DIRTY]) target[COMPUTED_DIRTY] = [];
  target[COMPUTED_DIRTY].push(dirtyKey);
}

// ── @store decorator ──

// Symbol for store metadata on prototype
const STORE_META = Symbol("loom:store:meta");

interface StoreMeta {
  key: string;         // property name
  defaults: any;       // initial value (cloned per instance)
  persist?: PersistOptions;
}

/**
 * Create a deep proxy that intercepts mutations and notifies the Reactive.
 * Handles nested objects and arrays (push, splice, etc.).
 */
function createDeepProxy<T extends object>(
  obj: T,
  onChange: () => void,
  persist?: PersistOptions,
): T {
  const proxyCache = new WeakMap<object, any>();

  function wrap(target: any): any {
    if (target === null || typeof target !== "object") return target;
    if (proxyCache.has(target)) return proxyCache.get(target);

    const proxy = new Proxy(target, {
      get(t, prop, receiver) {
        const value = Reflect.get(t, prop, receiver);
        // Wrap nested objects/arrays lazily
        if (value !== null && typeof value === "object" && typeof prop !== "symbol") {
          return wrap(value);
        }
        return value;
      },
      set(t, prop, value, receiver) {
        const result = Reflect.set(t, prop, value, receiver);
        // Persist directly — Reactive.set() would skip (same object ref)
        if (persist) {
          persist.storage.set(persist.key, JSON.stringify(obj));
        }
        onChange();
        return result;
      },
      deleteProperty(t, prop) {
        const result = Reflect.deleteProperty(t, prop);
        if (persist) {
          persist.storage.set(persist.key, JSON.stringify(obj));
        }
        onChange();
        return result;
      },
    });

    proxyCache.set(target, proxy);
    return proxy;
  }

  return wrap(obj);
}

/**
 * Component-scoped reactive store with optional persistence.
 * Creates a deep Proxy so nested mutations trigger re-render.
 *
 * ```ts
 * @store<TodoState>({ items: [], filter: "all" })
 * state!: TodoState;
 *
 * // Persisted
 * @store<TodoState>({ items: [], filter: "all" }, { key: "todos", storage: new LocalAdapter() })
 * state!: TodoState;
 * ```
 */
export function store<T extends object>(
  defaults: T,
  persist?: PersistOptions,
) {
  return function (target: any, propertyKey: string): void {
    // Accumulate metadata on the prototype
    if (!target[STORE_META]) target[STORE_META] = [];
    const meta: StoreMeta = { key: propertyKey, defaults, persist };
    target[STORE_META].push(meta);

    // Storage symbol for the backing Reactive
    const reactiveKey = Symbol(`store:${propertyKey}`);
    const proxyKey = Symbol(`store:proxy:${propertyKey}`);

    Object.defineProperty(target, propertyKey, {
      get() {
        // Lazy init on first access
        if (!this[reactiveKey]) {
          // Deep clone defaults so each instance is isolated
          const initial = JSON.parse(JSON.stringify(defaults));
          const r = new Reactive<T>(initial, persist);
          this[reactiveKey] = r;

          // Subscribe to trigger re-render
          r.subscribe(() => this.scheduleUpdate?.());

          // Create the proxy over the reactive's value
          const notifyChange = () => this.scheduleUpdate?.();
          this[proxyKey] = createDeepProxy(r.value, notifyChange, persist);
        }
        return this[proxyKey];
      },
      set(val: any) {
        if (!this[reactiveKey]) {
          // First set — init the reactive
          const r = new Reactive<T>(val, persist);
          this[reactiveKey] = r;
          r.subscribe(() => this.scheduleUpdate?.());

          const notifyChange = () => this.scheduleUpdate?.();
          this[proxyKey] = createDeepProxy(r.value, notifyChange, persist);
        } else {
          // Full replacement
          this[reactiveKey].set(val);
          const notifyChange = () => this.scheduleUpdate?.();
          this[proxyKey] = createDeepProxy(this[reactiveKey].value, notifyChange, persist);
        }
      },
      enumerable: true,
      configurable: true,
    });
  };
}

