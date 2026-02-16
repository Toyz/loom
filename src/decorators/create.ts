/**
 * createDecorator — Universal decorator factory.
 *
 * The foundation every Loom decorator is built on.
 *
 * Setup runs at **define-time** (on the prototype or constructor).
 * If setup returns a function, it runs **per-instance on connect**.
 * If the connect function returns a function, it runs **on disconnect**.
 *
 * Flow: define → connect → disconnect
 *
 * @typeParam Args — Tuple of decorator argument types
 * @typeParam T    — Element type (default: any)
 *
 * ```ts
 * // Define-time only — property getter
 * const query = createDecorator<[sel: string]>((proto, key, sel) => {
 *   Object.defineProperty(proto, key, {
 *     get() { return this.shadow.querySelector(sel); }
 *   });
 * });
 *
 * // Lifecycle only — setup on connect, cleanup on disconnect
 * const interval = createDecorator<[ms: number]>((proto, key, ms) => {
 *   return (el) => {
 *     const id = setInterval(() => el[key](), ms);
 *     return () => clearInterval(id);
 *   };
 * });
 *
 * // Both — define-time work + lifecycle
 * const on = createDecorator<[Type: any]>((proto, key, Type) => {
 *   // define-time: store metadata, modify prototype, etc.
 *   return (el) => bus.on(Type, (e) => el[key](e));
 * });
 *
 * // Class decorator
 * const component = createDecorator<[tag: string]>((ctor, tag) => {
 *   app.register(tag, ctor);
 * }, { class: true });
 * ```
 */

type ConnectFn = (element: any) => void | (() => void);
type PropertySetup<Args extends any[]> = (proto: any, key: string, ...args: Args) => void | ConnectFn;
type MethodSetup<Args extends any[]> = (proto: any, key: string, desc: PropertyDescriptor, ...args: Args) => void | ConnectFn;
type ClassSetup<Args extends any[]> = (ctor: any, ...args: Args) => void;

export interface DecoratorOptions {
  class?: boolean;
}

// Overload: class decorator
export function createDecorator<Args extends any[] = [], T = any>(
  setup: ClassSetup<Args>,
  options: { class: true },
): (...args: Args) => (ctor: any) => void;

// Overload: property/method decorator (default)
export function createDecorator<Args extends any[] = [], T = any>(
  setup: PropertySetup<Args>,
  options?: { class?: false },
): (...args: Args) => (target: any, key: string, desc?: PropertyDescriptor) => void;

// Implementation
export function createDecorator<Args extends any[] = []>(
  setup: (...args: any[]) => any,
  options: DecoratorOptions = { class: false },
) {
  if (options.class) {
    // Class decorator: (...args) => (ctor) => void
    return (...args: Args) => {
      return (ctor: any) => {
        (setup as ClassSetup<Args>)(ctor, ...args);
      };
    };
  }

  // Property/method decorator: (...args) => (target, key, desc?) => void
  return (...args: Args) => {
    return (target: any, key: string, desc?: PropertyDescriptor) => {
      const connectFn = desc
        ? (setup as MethodSetup<Args>)(target, key, desc, ...args)
        : (setup as PropertySetup<Args>)(target, key, ...args);

      if (typeof connectFn === "function") {
        // Has lifecycle — wire into connectedCallback
        const orig = target.connectedCallback;
        target.connectedCallback = function () {
          orig?.call(this);
          const cleanup = (connectFn as ConnectFn)(this);
          if (cleanup) this.track(cleanup);
        };
      }
    };
  };
}
