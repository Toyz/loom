/**
 * Loom — Lifecycle decorators (TC39 Stage 3)
 *
 * @catch_  — Wrap update() with a try/catch, render fallback on error
 * @suspend — Show fallback until method resolves
 * @mount   — Run method on connectedCallback
 * @unmount — Run method on disconnectedCallback
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

/** Function called when update() throws */
type CatchFn = (
  error: unknown,
  element: HTMLElement & { shadow: ShadowRoot },
) => void;

/**
 * Error-boundary decorator. If update() throws, catches the error
 * and calls the handler with (error, element).
 *
 * ```ts
 * @component("my-page")
 * @catch_((err, el) => { el.shadow.innerHTML = `<p>Error: ${err}</p>`; })
 * class MyPage extends LoomElement { ... }
 * ```
 */
export function catch_(handler: CatchFn) {
  return (value: Function, _context: ClassDecoratorContext) => {
    const origUpdate = value.prototype.update;
    value.prototype.update = function () {
      try {
        return origUpdate.call(this);
      } catch (err) {
        handler(err, this as HTMLElement & { shadow: ShadowRoot });
        return null;
      }
    };
  };
}

/**
 * Suspend decorator. Wraps an async method with loading/error state
 * management. Sets `this.loading = true` before the call, and
 * `this.loading = false` after. Captures errors on `this.error`.
 *
 * Use as `@suspend()` on a method:
 * ```ts
 * @suspend()
 * async fetchData() { this.result = await api.get(); }
 * ```
 */
export function suspend() {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    return function (this: any, ...args: any[]) {
      this.loading = true;
      this.error = null;
      this.scheduleUpdate?.();
      return Promise.resolve()
        .then(() => method.call(this, ...args))
        .then((result: any) => {
          this.loading = false;
          this.scheduleUpdate?.();
          return result;
        })
        .catch((err: Error) => {
          this.loading = false;
          this.error = err;
          this.scheduleUpdate?.();
        });
    };
  };
}


/**
 * Run decorated method when the element connects to the DOM.
 *
 * ```ts
 * @mount
 * setup() { this.shadow.adoptedStyleSheets = [myStyles]; }
 * ```
 */
export function mount(method: Function, context: ClassMethodDecoratorContext) {
  context.addInitializer(function (this: any) {
    if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
    this[CONNECT_HOOKS].push((el: any) => {
      method.call(el);
    });
  });
}

/**
 * Run decorated method when the element disconnects from the DOM.
 *
 * ```ts
 * @unmount
 * teardown() { console.log("removed!"); }
 * ```
 */
export function unmount(method: Function, context: ClassMethodDecoratorContext) {
  context.addInitializer(function (this: any) {
    if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];
    // Return a cleanup function that calls the unmount method
    this[CONNECT_HOOKS].push((el: any) => {
      return () => method.call(el);
    });
  });
}
