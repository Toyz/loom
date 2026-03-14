/**
 * Loom — Application entry point + DI container
 *
 * Boots the render loop, instantiates @service singletons,
 * runs @factory methods, and registers @component custom elements.
 * Also exports DI decorators: @service, @inject, @maybe, @factory.
 *
 * ```ts
 * import { app, service, inject } from "loom";
 *
 * app
 *   .use(natsConnection)
 *   .use(chatClient)
 *   .start();
 * ```
 */

import { renderLoop } from "./render-loop";
import { INJECT_PARAMS, ON_HANDLERS, SERVICE_NAME } from "./decorators/symbols";
import { createDecorator } from "./decorators/create";
import { bus, type Constructor, type Handler } from "./bus";
import type { LoomEvent } from "./event";
import { LoomResult } from "./result";
import { hasStart, hasStop, hasSuspend, hasResume } from "./lifecycle";

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
  private _visibilityCleanup: (() => void) | null = null;

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
      if (typeof instance === "function" && instance.prototype?.constructor === instance) {
        // Class constructor → auto-construct with @inject DI resolution
        const args = this.resolveParams(instance.prototype, "constructor");
        this.providers.set(keyOrThing, new instance(...args));
      } else {
        this.providers.set(keyOrThing, instance);
      }
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
    if (!this.services.includes(ctor)) {
      this.services.push(ctor);
    }
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

  /** Check if a provider is registered. */
  has(key: any): boolean {
    return this.providers.has(key);
  }

  /** Replace an existing provider. Useful for testing / hot-swap. */
  replace<T = any>(key: any, value: T): this {
    this.providers.set(key, value);
    return this;
  }

  /** Full container reset — providers, services, factories, components. */
  reset(): void {
    this.providers.clear();
    this.services.length = 0;
    this.factories.length = 0;
    this.components.length = 0;
    this._started = false;
    if (this._visibilityCleanup) {
      this._visibilityCleanup();
      this._visibilityCleanup = null;
    }
  }

  /** List all registered provider keys (debug / inspection). */
  keys(): any[] {
    return [...this.providers.keys()];
  }

  /** Resolve @inject parameter metadata for a constructor or method. */
  private resolveParams(proto: any, method: string): any[] {
    const meta: { method: string; index: number; key: any }[] =
      proto?.[INJECT_PARAMS.key] ?? [];
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
      // Also register by @service("name") string key for name-based injection
      const svcName: string | undefined = Svc[SERVICE_NAME.key];
      if (svcName && !this.providers.has(svcName)) {
        this.providers.set(svcName, this.providers.get(Svc));
      }
      // Wire @on event handlers (bus events + DOM events)
      const instance = this.providers.get(Svc);
      for (const handler of instance[ON_HANDLERS.key] ?? []) {
        if (handler.domTarget) {
          // DOM EventTarget: @on(window, "resize")
          handler.domTarget.addEventListener(handler.event, (e: Event) => instance[handler.key](e));
        } else {
          // Bus event: @on(ColorSelect)
          bus.on(handler.type, (e: any) => instance[handler.key](e));
        }
      }
      // LoomLifecycle — auto-call start() if the service implements it
      if (hasStart(instance)) await instance.start();
    }

    // 2. Run @factory methods on instantiated services
    for (const { fn, method, key } of this.factories) {
      const result = await fn();
      if (result != null) {
        this.providers.set(key ?? result.constructor, result);
      }
    }

    // 2b. Call start() on app.use() providers that implement LoomLifecycle
    //     (skip @service instances — already started in step 1)
    const serviceInstances = new Set(this.services.map((s: any) => this.providers.get(s)));
    for (const instance of this.providers.values()) {
      if (!serviceInstances.has(instance) && hasStart(instance)) {
        await instance.start();
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

    // 5. Wire visibilitychange for suspend/resume lifecycle
    this._wireVisibility();

    this._started = true;
  }

  /** Tear down — call stop() on lifecycle-aware providers (reverse order), then stop render loop */
  stop(): void {
    // Remove visibilitychange listener
    if (this._visibilityCleanup) {
      this._visibilityCleanup();
      this._visibilityCleanup = null;
    }
    // LoomLifecycle — call stop() in reverse registration order
    const serviceInstances = new Set(this.services.map((s: any) => this.providers.get(s)));
    for (const Svc of [...this.services].reverse()) {
      const instance = this.providers.get(Svc);
      if (instance && hasStop(instance)) instance.stop();
    }
    // Also call stop() on app.use() providers
    for (const instance of this.providers.values()) {
      if (!serviceInstances.has(instance) && hasStop(instance)) instance.stop();
    }
    renderLoop.stop();
    this._started = false;
  }

  /**
   * Call suspend() on all lifecycle-aware providers.
   * Invoked automatically on `visibilitychange` (tab hidden), or manually.
   */
  suspend(): void {
    for (const instance of this.providers.values()) {
      if (hasSuspend(instance)) instance.suspend();
    }
  }

  /**
   * Call resume() on all lifecycle-aware providers.
   * Invoked automatically on `visibilitychange` (tab visible), or manually.
   */
  resume(): void {
    for (const instance of this.providers.values()) {
      if (hasResume(instance)) instance.resume();
    }
  }

  /** Wire document.visibilitychange to auto-call suspend/resume on services */
  private _wireVisibility(): void {
    if (typeof document === "undefined") return; // SSR guard
    const handler = () => {
      if (document.hidden) this.suspend();
      else this.resume();
    };
    document.addEventListener("visibilitychange", handler);
    this._visibilityCleanup = () => document.removeEventListener("visibilitychange", handler);
  }

  /** Whether the app has been started */
  get started(): boolean {
    return this._started;
  }
}

/** Module-level singleton — the Loom app instance */
export const app = new LoomApp();
export type { LoomApp };

// ── DI decorators (merged from di/decorators.ts) ──

/**
 * Auto-instantiated singleton. Registered on app.start().
 * Optionally accepts a minification-safe name.
 *
 * ```ts
 * @service
 * class BookmarkStore extends CollectionStore<Bookmark> { ... }
 *
 * @service("UserService")
 * class UserService { ... }
 * ```
 */
export const service = createDecorator<[name?: string]>((ctor, name?) => {
  if (name) (ctor as any)[SERVICE_NAME.key] = name;
  // Duplicate guard — skip if already queued
  if (!(app as any).services.includes(ctor)) {
    app.registerService(ctor);
  }
}, { class: true });

/**
 * Resolve the display name for a service class.
 * Returns the @service("name") value if present, otherwise class.name.
 */
export function resolveServiceName(cls: new (...args: any[]) => any): string {
  return (cls as any)[SERVICE_NAME.key] ?? cls.name;
}

/**
 * Property-mode dependency injection via auto-accessor.
 * Resolves lazily from the DI container on first access.
 * Throws if the provider is not registered — use @maybe for optional.
 *
 * ```ts
 * @inject(AuthService) accessor auth!: AuthService;
 * @inject("AuthService") accessor auth!: AuthService;
 * ```
 */
export function inject<T = unknown>(key: (new (...args: unknown[]) => T) | string) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, T>,
    _context: ClassAccessorDecoratorContext<This, T>,
  ): ClassAccessorDecoratorResult<This, T> => {
    return {
      get(): T {
        return app.get<T>(key);
      },
      set(_val: T) {
        if (typeof console !== "undefined") {
          console.warn(`[loom] Cannot set @inject property — injection is read-only.`);
        }
      },
    };
  };
}

/**
 * Optional dependency injection. Returns `undefined` if the provider
 * is not registered, instead of throwing.
 *
 * ```ts
 * @maybe(AnalyticsService) accessor analytics?: AnalyticsService;
 * ```
 */
export function maybe<T = unknown>(key: (new (...args: unknown[]) => T) | string) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, T | undefined>,
    _context: ClassAccessorDecoratorContext<This, T | undefined>,
  ): ClassAccessorDecoratorResult<This, T | undefined> => {
    return {
      get(): T | undefined {
        return app.has(key) ? app.get<T>(key) : undefined;
      },
      set(_val: T | undefined) {
        if (typeof console !== "undefined") {
          console.warn(`[loom] Cannot set @maybe property — injection is read-only.`);
        }
      },
    };
  };
}

/**
 * Method decorator on @service classes.
 * Return value is registered as a provider on app.start().
 *
 * ```ts
 * @service
 * class Boot {
 *   @factory(ChatServiceNatsClient)
 *   createChat() {
 *     return new ChatServiceNatsClient(app.get(NatsConnection));
 *   }
 * }
 * ```
 */
export const factory = createDecorator<[key?: unknown]>((method, methodName, key) => {
  app.registerFactory(key, { method: methodName, fn: method });
});
