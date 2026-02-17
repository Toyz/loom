/**
 * Loom — Application entry point
 *
 * Boots the render loop, instantiates @service singletons,
 * runs @factory methods, and registers @component custom elements.
 *
 * ```ts
 * import { app } from "loom";
 *
 * app
 *   .use(natsConnection)
 *   .use(chatClient)
 *   .start();
 * ```
 */

import { renderLoop } from "./render-loop";
import { INJECT_PARAMS, ON_HANDLERS } from "./decorators/symbols";
import { bus, type Constructor, type Handler } from "./bus";
import type { LoomEvent } from "./event";
import { LoomResult } from "./result";

interface FactoryMeta {
  fn: Function;
  method: string;
  key?: any;
}

class LoomApp {
  private providers = new Map<any, any>();
  private services: any[] = [];
  private factories: FactoryMeta[] = [];
  private components: { tag: string; ctor: CustomElementConstructor }[] = [];
  private _started = false;

  // ── Event bus (delegates to the module-level bus singleton) ──

  /** Subscribe to a typed event. Returns unsubscribe function. */
  on<T>(type: Constructor<T>, handler: Handler<T>): () => void { return bus.on(type, handler); }

  /** Emit a typed event to all listeners. */
  emit<T extends LoomEvent>(event: T): void { bus.emit(event); }

  /** Remove a specific event handler. */
  off<T>(type: Constructor<T>, handler: Handler<T>): void { bus.off(type, handler); }

  // ── Provider registration ──

  /**
   * Chainable provider registration.
   *
   *   app.use(instance)              — key auto-inferred from constructor
   *   app.use(MyClass)               — class constructor, auto-instantiated
   *   app.use(() => createThing())   — factory fn, key from result constructor
   *   app.use(Key, instance)         — explicit key
   *
   * T is always optional — no magic typing forced.
   */
  use<T = any>(thing: T): this;
  use<T = any>(key: any, instance: T): this;
  use(keyOrThing: any, instance?: any): this {
    if (instance !== undefined) {
      // Explicit key: app.use(Key, value)
      this.providers.set(keyOrThing, instance);
    } else if (typeof keyOrThing === "function") {
      if (keyOrThing.prototype?.constructor === keyOrThing) {
        // Class constructor → instantiate
        this.providers.set(keyOrThing, new keyOrThing());
      } else {
        // Factory function → call it
        const result = keyOrThing();
        this.providers.set(result.constructor, result);
      }
    } else {
      // Instance → key from constructor
      this.providers.set(keyOrThing.constructor, keyOrThing);
    }
    return this;
  }

  // ── Registration (called by decorators) ──

  /** Queue a @service class for auto-instantiation on start() */
  registerService(ctor: any): void {
    this.services.push(ctor);
  }

  /** Queue a @factory method for invocation on start() */
  registerFactory(key: any, info: { method: string; fn: Function }): void {
    this.factories.push({ key, ...info });
  }

  /** Queue a @component for customElements.define() on start() */
  register(tag: string, ctor: CustomElementConstructor): void {
    this.components.push({ tag, ctor });
    // Late registration (after start): define immediately so lazy-loaded
    // components get upgraded by the browser's custom element registry.
    if (this._started && !customElements.get(tag)) {
      customElements.define(tag, ctor);
    }
  }

  // ── Resolution ──

  /** Retrieve a provider/service by key. Throws if missing. */
  get<T = any>(key: any): T {
    const v = this.providers.get(key);
    if (v === undefined) {
      throw new Error(`[loom] no provider for ${key?.name ?? key}`);
    }
    return v as T;
  }

  /** Retrieve a provider/service — returns LoomResult instead of undefined. */
  maybe<T = any>(key: any): LoomResult<T, Error> {
    const v = this.providers.get(key);
    if (v !== undefined) return LoomResult.ok(v as T);
    return LoomResult.err(new Error(`[loom] no provider for ${key?.name ?? key}`));
  }

  /** Resolve @inject parameter metadata for a constructor or method. */
  private resolveParams(proto: any, method: string): any[] {
    const meta: { method: string; index: number; key: any }[] =
      proto?.[INJECT_PARAMS] ?? [];
    const params = meta
      .filter((m) => m.method === method)
      .sort((a, b) => a.index - b.index);
    return params.map((m) => this.get(m.key));
  }

  // ── Lifecycle ──

  /**
   * Boot the app:
   *  1. Auto-instantiate @service singletons (with constructor @inject)
   *  2. Run @factory methods (with parameter @inject)
   *  3. Start the render loop
   *  4. Register all @component custom elements
   */
  async start(): Promise<void> {
    if (this._started) return;

    // 1. Instantiate @service singletons and wire @on handlers
    for (const Svc of this.services) {
      if (!this.providers.has(Svc)) {
        const args = this.resolveParams(Svc.prototype, "constructor");
        this.providers.set(Svc, new Svc(...args));
      }
      // Wire @on event handlers (bus events + DOM events)
      const instance = this.providers.get(Svc);
      for (const handler of instance[ON_HANDLERS] ?? []) {
        if (handler.domTarget) {
          // DOM EventTarget: @on(window, "resize")
          handler.domTarget.addEventListener(handler.event, (e: Event) => instance[handler.key](e));
        } else {
          // Bus event: @on(ColorSelect)
          bus.on(handler.type, (e: any) => instance[handler.key](e));
        }
      }
    }

    // 2. Run @factory methods on instantiated services
    for (const { fn, method, key } of this.factories) {
      const result = await fn();
      if (result != null) {
        this.providers.set(key ?? result.constructor, result);
      }
    }

    // 3. Start render loop
    renderLoop.start();

    // 4. Register all queued custom elements
    for (const { tag, ctor } of this.components) {
      if (!customElements.get(tag)) {
        customElements.define(tag, ctor);
      }
    }

    this._started = true;
  }

  /** Tear down — stop render loop */
  stop(): void {
    renderLoop.stop();
    this._started = false;
  }

  /** Whether the app has been started */
  get started(): boolean {
    return this._started;
  }
}

/** Module-level singleton — the Loom app instance */
export const app = new LoomApp();
export type { LoomApp };
