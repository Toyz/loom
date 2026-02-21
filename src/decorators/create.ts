/**
 * createDecorator — Universal decorator factory (TC39 Stage 3).
 *
 * The foundation every Loom decorator is built on.
 *
 * Setup runs at **define-time** (on the method or constructor).
 * If setup returns a function, it runs **per-instance on connect**.
 * If the connect function returns a function, it runs **on disconnect**.
 *
 * Flow: define → connect → disconnect
 *
 * @typeParam Args — Tuple of decorator argument types
 *
 * ```ts
 * // Method decorator with lifecycle
 * const interval = createDecorator<[ms: number]>((method, key, ms) => {
 *   return (el) => {
 *     const id = setInterval(() => method.call(el), ms);
 *     return () => clearInterval(id);
 *   };
 * });
 *
 * // Method decorator, define-time only
 * const guard = createDecorator<[name?: string]>((method, key, name) => {
 *   guardRegistry.set(name ?? key, method);
 * });
 *
 * // Class decorator
 * const component = createDecorator<[tag: string]>((ctor, tag) => {
 *   customElements.define(tag, ctor as any);
 * }, { class: true });
 * ```
 */

import { CONNECT_HOOKS } from "./symbols";

type ConnectFn = (element: HTMLElement) => void | (() => void);
type MethodSetup<Args extends unknown[]> = (
  method: Function,
  key: string,
  ...args: Args
) => void | ConnectFn;
type ClassSetup<Args extends unknown[]> = (
  ctor: Function,
  ...args: Args
) => void;

export interface DecoratorOptions {
  class?: boolean;
}

// Overload: class decorator
export function createDecorator<Args extends unknown[] = []>(
  setup: ClassSetup<Args>,
  options: { class: true },
): (...args: Args) => (value: Function, context: ClassDecoratorContext) => void;

// Overload: method decorator (default)
export function createDecorator<Args extends unknown[] = []>(
  setup: MethodSetup<Args>,
  options?: { class?: false },
): (...args: Args) => (method: Function, context: ClassMethodDecoratorContext) => void;

// Implementation
export function createDecorator<Args extends unknown[] = []>(
  setup: MethodSetup<Args> | ClassSetup<Args>,
  options: DecoratorOptions = { class: false },
) {
  if (options.class) {
    // Class decorator: (...args) => (value, context) => void
    return (...args: Args) => {
      return (value: Function, _context: ClassDecoratorContext) => {
        (setup as ClassSetup<Args>)(value, ...args);
      };
    };
  }

  // Method decorator: (...args) => (method, context) => void
  // Setup receives (method, key, ...args).
  // If a ConnectFn is returned, push it to CONNECT_HOOKS for LoomElement to consume.
  return (...args: Args) => {
    return (method: Function, context: ClassMethodDecoratorContext) => {
      const key = String(context.name);
      const connectFn = (setup as MethodSetup<Args>)(method, key, ...args);

      if (typeof connectFn === "function") {
        // Has lifecycle — register as connect hook
        context.addInitializer(function (this: any) {
          if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];
          this[CONNECT_HOOKS.key].push(connectFn);
        });
      }
    };
  };
}
