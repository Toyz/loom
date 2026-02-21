/**
 * Loom — Lifecycle decorators (TC39 Stage 3)
 *
 * @catch_  — Wrap update() with a try/catch, render fallback on error
 * @suspend — Show fallback until method resolves
 * @mount   — Run method on connectedCallback
 * @unmount — Run method on disconnectedCallback
 */

import { CONNECT_HOOKS } from "../decorators/symbols";
import { CATCH_HANDLER, CATCH_HANDLERS } from "../decorators/symbols";

/** Function called when update() throws or an @api fetch fails */
type CatchFn = (
  error: unknown,
  element: HTMLElement & { shadow: ShadowRoot },
) => void;

/**
 * Error-boundary decorator — works as class or method decorator.
 *
 * Also handles @api fetch errors — when an API call fails,
 * the same handler is invoked automatically.
 *
 * **Class decorator** (inline handler — catch-all):
 * ```ts
 * @catch_((err, el) => { el.shadow.innerHTML = `<p>Error: ${err}</p>`; })
 * class MyPage extends LoomElement { ... }
 * ```
 *
 * **Method decorator** (catch-all):
 * ```ts
 * @catch_
 * handleError(err: unknown) { ... }
 * ```
 *
 * **Named method decorator** (scoped to a specific @api accessor):
 * ```ts
 * @catch_("team")
 * handleTeamError(err: unknown) { ... }
 * ```
 */
export function catch_(
  handlerOrMethodOrName: CatchFn | Function | string,
  context?: ClassDecoratorContext | ClassMethodDecoratorContext,
): any {
  // ── @catch_ (bare method decorator) ──
  if (context && context.kind === "method") {
    const method = handlerOrMethodOrName as Function;
    context.addInitializer(function (this: any) {
      const handler: CatchFn = (err, el) => method.call(el, err, el);
      this[CATCH_HANDLER.key] = handler;

      const origUpdate = this.update?.bind(this);
      if (origUpdate) {
        this.update = function () {
          try { return origUpdate(); }
          catch (err) { handler(err, this); return null; }
        };
      }
    });
    return;
  }

  // ── @catch_("name") (named method decorator) ──
  if (typeof handlerOrMethodOrName === "string") {
    const name = handlerOrMethodOrName;
    return (method: Function, ctx: ClassMethodDecoratorContext) => {
      ctx.addInitializer(function (this: any) {
        if (!this[CATCH_HANDLERS.key]) this[CATCH_HANDLERS.key] = new Map();
        const handler: CatchFn = (err, el) => method.call(el, err, el);
        this[CATCH_HANDLERS.key].set(name, handler);
      });
    };
  }

  // ── @catch_((err, el) => { ... }) (class decorator — catch-all) ──
  const handler = handlerOrMethodOrName as CatchFn;
  return (value: Function, _context: ClassDecoratorContext) => {
    (value.prototype as any)[CATCH_HANDLER.key] = handler;

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
    if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];
    this[CONNECT_HOOKS.key].push((el: any) => {
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
    if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];
    // Return a cleanup function that calls the unmount method
    this[CONNECT_HOOKS.key].push((el: any) => {
      return () => method.call(el);
    });
  });
}
