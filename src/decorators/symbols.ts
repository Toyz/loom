// ── Symbol keys ──
// Shared contract between decorators and LoomElement.
// All symbols are created via createSymbol() and auto-registered
// in SYMBOL_REGISTRY for introspection by inspect().

/**
 * LoomSymbol<T> — A typed wrapper around a raw `symbol`.
 *
 * Provides type-safe `from()`, `set()`, `has()` methods for metadata access.
 * The underlying `symbol` is available via `.key` for direct property access.
 */
export class LoomSymbol<T = unknown> {
  readonly key: symbol;
  readonly name: string;

  constructor(name: string) {
    this.name = name;
    this.key = Symbol(`loom:${name}`);
  }

  /** Read metadata from target — typed */
  from(target: object): T | undefined {
    return (target as Record<symbol, unknown>)[this.key] as T | undefined;
  }

  /** Write metadata to target — typed */
  set(target: object, value: T): void {
    (target as Record<symbol, unknown>)[this.key] = value;
  }

  /** Check if target has this metadata */
  has(target: object): boolean {
    return this.key in target;
  }

  /** True when `target` carries this metadata as its OWN property, not inherited */
  hasOwn(target: object): boolean {
    return Object.prototype.hasOwnProperty.call(target, this.key);
  }

  /**
   * Array metadata guaranteed to be OWN to `target` — copy-on-inherit.
   *
   * `from()` is a plain property read, so it walks the prototype chain. Class
   * constructors inherit from their superclass constructor, so
   * `REACTIVES.from(Sub)` returns the *base's* array and `.push()` mutates it
   * in place — leaking a subclass's fields into its parent and into every
   * sibling subclass. This returns an array the target owns, seeded from the
   * inherited one, so extending a subclass never touches the base.
   *
   * Non-enumerable so metadata stays out of `Object.keys(ctor)` / static spread.
   */
  ownArray<E>(target: object): E[] {
    if (this.hasOwn(target)) return (target as Record<symbol, unknown>)[this.key] as E[];
    const inherited = (target as Record<symbol, unknown>)[this.key] as E[] | undefined;
    const arr: E[] = inherited ? inherited.slice() : [];
    Object.defineProperty(target, this.key, {
      value: arr, writable: true, configurable: true, enumerable: false,
    });
    return arr;
  }

  /** Map metadata guaranteed to be OWN to `target` — copy-on-inherit. See {@link ownArray}. */
  ownMap<K, V>(target: object): Map<K, V> {
    if (this.hasOwn(target)) return (target as Record<symbol, unknown>)[this.key] as Map<K, V>;
    const inherited = (target as Record<symbol, unknown>)[this.key] as Map<K, V> | undefined;
    const map = inherited ? new Map<K, V>(inherited) : new Map<K, V>();
    Object.defineProperty(target, this.key, {
      value: map, writable: true, configurable: true, enumerable: false,
    });
    return map;
  }

  /** Symbol description */
  get description(): string | undefined {
    return this.key.description;
  }

  toString(): string { return this.key.toString(); }
}

const SYMBOL_REGISTRY = new Map<string, LoomSymbol>();

export function createSymbol<T = unknown>(name: string): LoomSymbol<T> {
  const existing = SYMBOL_REGISTRY.get(name);
  if (existing) return existing as LoomSymbol<T>;
  const sym = new LoomSymbol<T>(name);
  SYMBOL_REGISTRY.set(name, sym);
  return sym;
}

/**
 * Create a typed LoomSymbol without singleton registration.
 * Use for per-accessor private storage keys where you want
 * the typed .from()/.set()/.has() API but not shared identity.
 */
export function localSymbol<T = unknown>(name: string): LoomSymbol<T> {
  return new LoomSymbol<T>(name);
}

export { SYMBOL_REGISTRY };

export const REACTIVES = createSymbol("reactives");
export const PROPS = createSymbol("props");
export const ON_HANDLERS = createSymbol("on");
export const WATCHERS = createSymbol("watch");
export const EMITTERS = createSymbol("emit");
export const COMPUTED_DIRTY = createSymbol("computed:dirty");
export const CATCH_HANDLER = createSymbol("catch");
export const CATCH_HANDLERS = createSymbol("catch:named");
export const MOUNT_HANDLERS = createSymbol("mount");
export const UNMOUNT_HANDLERS = createSymbol("unmount");
export const INJECT_PARAMS = createSymbol("inject:params");
export const ROUTE_PROPS = createSymbol("route:props");
export const TRANSFORMS = createSymbol("transforms");
export const ROUTE_ENTER = createSymbol("route:enter");
export const ROUTE_LEAVE = createSymbol("route:leave");
export const CONNECT_HOOKS = createSymbol("connect:hooks");

/**
 * Resolve the DOM element a connect-hook host operates on.
 *
 * A `LoomElement` *is* its element, so it resolves to itself. A
 * `LoomAttribute` controller wraps a foreign element exposed as `.el`, so it
 * resolves to that. This lets DOM-targeting decorators (@observer, @hotkey, …)
 * work on both without importing either class. Method binding still uses the
 * raw host — only the DOM target is redirected.
 */
export function hostElement(host: unknown): HTMLElement {
  const el = (host as { el?: unknown })?.el;
  return (el instanceof Element ? el : host) as HTMLElement;
}

/** A connect hook: runs on connect, may return a cleanup run on disconnect. */
export type ConnectHook = (host: any) => (() => void) | void;

/**
 * Register a connect hook on a host INSTANCE.
 *
 * Call from inside `context.addInitializer`, where `this` is the instance.
 * Uses `ownArray` so the list is always an own property — otherwise a hook
 * array reachable on a prototype would be shared, and every instance would
 * append one more hook to it.
 */
export function addConnectHook(host: object, hook: ConnectHook): void {
  CONNECT_HOOKS.ownArray<ConnectHook>(host).push(hook);
}

/** Read the connect hooks registered on a host instance. */
export function getConnectHooks(host: object): ConnectHook[] | undefined {
  return CONNECT_HOOKS.from(host) as ConnectHook[] | undefined;
}
export const FIRST_UPDATED_HOOKS = createSymbol("first-updated:hooks");
export const SERVICE_NAME = createSymbol<string>("service:name");