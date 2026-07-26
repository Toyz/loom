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
import { ON_HANDLERS, SERVICE_NAME } from "./decorators/symbols";
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

/**
 * Distinguish a class constructor from a plain factory function.
 *
 * `fn.prototype?.constructor === fn` is true for EVERY non-arrow function
 * declaration, so `app.use(function makeThing() { ... })` was `new`-ed and the
 * container ended up holding an empty instance of the factory itself. Source
 * text is the only reliable signal at runtime; TS targets ES2022, so classes
 * are emitted as `class`.
 */
function isClassCtor(fn: Function): boolean {
  return /^\s*class[\s{]/.test(Function.prototype.toString.call(fn));
}

class LoomApp {
  private providers = new Map<any, any>();
  private services: any[] = [];
  /** Instances whose @on handlers are already bound, so re-wiring is a no-op. */
  private _wired = new WeakSet<object>();
  private factories: FactoryMeta[] = [];
  private components: { tag: string; ctor: CustomElementConstructor }[] = [];
  private _started = false;
  private _visibilityCleanup: (() => void) | null = null;
  /** Unsubscribers for @on handlers wired during start() */
  private _handlerUnsubs: (() => void)[] = [];

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
      if (typeof instance === "function" && isClassCtor(instance)) {
        // Class constructor → construct
        this.providers.set(keyOrThing, new instance());
      } else {
        this.providers.set(keyOrThing, instance);
      }
    } else if (typeof keyOrThing === "function") {
      if (isClassCtor(keyOrThing)) {
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

  /** Register a class provider explicitly — no heuristic. */
  useClass<T = any>(ctor: new () => T, key?: any): this {
    this.providers.set(key ?? ctor, new ctor());
    return this;
  }

  /** Register a factory provider explicitly — no heuristic. */
  useFactory<T = any>(fn: () => T, key?: any): this {
    const result = fn();
    this.providers.set(key ?? (result as any)?.constructor, result);
    return this;
  }

  // ── Registration (called by decorators) ──

  /**
   * Queue a @service class. If the app has already started, bring it up now
   * rather than never — a service declared in a lazily-loaded route module
   * registers long after start(), and start() is one-shot.
   */
  registerService(ctor: any): void {
    if (this.services.includes(ctor)) return;
    this.services.push(ctor);
    if (this._started) {
      const instance = this.wireService(ctor);
      // Fire-and-forget: registerService is called from a decorator, which
      // cannot await. Failing to start is reported rather than swallowed.
      if (hasStart(instance)) {
        void Promise.resolve(instance.start()).catch((e: unknown) =>
          console.error(`[loom] ${ctor?.name ?? "service"}.start() failed`, e),
        );
      }
    }
  }


  /**
   * Construct a @service and wire its @on handlers. Idempotent.
   *
   * Split out of start() so a service registered *after* the app has started
   * still comes up. Registration happens at class-definition time, so a
   * @service inside a lazily-loaded route module — or one re-registered by
   * HMR — used to be queued and then never looked at again, because start()
   * is one-shot. Nothing else was ever going to come back for it.
   *
   * Everything here is synchronous, so app.get() works the instant a class is
   * registered; only the optional LoomLifecycle start() is awaited, by the
   * caller.
   */
  private wireService(Svc: any): any {
    if (!this.providers.has(Svc)) {
      // No constructor injection: TC39 stage-3 has no parameter decorators,
      // so INJECT_PARAMS was never written and resolveParams() always
      // returned []. Property injection via `@inject(Key) accessor` works.
      this.providers.set(Svc, new Svc());
    }
    // Also register by @service("name") string key for name-based injection
    const svcName: string | undefined = Svc[SERVICE_NAME.key];
    if (svcName && !this.providers.has(svcName)) {
      this.providers.set(svcName, this.providers.get(Svc));
    }

    const instance = this.providers.get(Svc);
    if (this._wired.has(instance)) return instance;   // handlers already bound
    this._wired.add(instance);

    // Wire @on event handlers (bus events + DOM events)
    for (const handler of instance[ON_HANDLERS.key] ?? []) {
      // Keep the unsubscriber: nothing used to, so stop() left every handler
      // wired and `start(); stop(); start();` — routine in tests and under
      // HMR — dispatched each event twice, with the first-generation service
      // instances pinned alive by the bus.
      if (handler.domTarget) {
        // DOM EventTarget: @on(window, "resize")
        const fn = (e: Event) => instance[handler.key](e);
        const target = handler.domTarget;
        target.addEventListener(handler.event, fn);
        this._handlerUnsubs.push(() => target.removeEventListener(handler.event, fn));
      } else {
        // Bus event: @on(ColorSelect)
        this._handlerUnsubs.push(bus.on(handler.type, (e: any) => instance[handler.key](e)));
      }
    }
    return instance;
  }

  /** Queue a @factory method for invocation on start() */
  registerFactory(key: any, info: { method: string; fn: Function }): void {
    this.factories.push({ key, ...info });
  }

  /**
   * Swap a queued @factory's function for one bound to its owning instance.
   * Replaces in place rather than appending, so the factory still runs once.
   */
  rebindFactory(original: Function, bound: Function): void {
    for (const entry of this.factories) {
      if (entry.fn === original) {
        entry.fn = bound;
        return;
      }
    }
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
    this._drainHandlers();
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
      const instance = this.wireService(Svc);
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
    this._drainHandlers();
    this._started = false;
  }

  /** Remove every @on handler wired by start(). */
  private _drainHandlers(): void {
    for (let i = 0; i < this._handlerUnsubs.length; i++) {
      try {
        this._handlerUnsubs[i]();
      } catch (e) {
        console.error("[Loom] failed to remove an @on handler", e);
      }
    }
    this._handlerUnsubs.length = 0;
    // The unsubscribers are gone, so the instances are no longer wired.
    // Without this, a restart would skip re-binding them and every @on
    // handler on a service would be silently dead after stop(); start().
    this._wired = new WeakSet<object>();
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
function applyService(ctor: any, name?: string): void {
  if (name) ctor[SERVICE_NAME.key] = name;
  app.registerService(ctor); // registerService already dedupes
}

/**
 * Usable bare or called: `@service` and `@service("Name")` both work.
 *
 * It cannot be built with createDecorator, which always produces a factory.
 * Under that shape, bare `@service` is invoked by the runtime as
 * `service(TheClass, context)` and returns the *inner* decorator function —
 * and a class decorator's return value replaces the class. So the class
 * silently became an anonymous arrow function: `new TheClass()` threw "is not
 * a constructor", and `.name` was empty, which is why the container reported
 * "no provider for " with nothing after it.
 *
 * Every other class decorator here takes a required first argument, so none of
 * them can be written bare and none is affected.
 */
export function service(name?: string): (ctor: any, context: ClassDecoratorContext) => void;
export function service(ctor: any, context: ClassDecoratorContext): void;
export function service(a?: any, b?: any): any {
  // Direct use: the runtime calls a class decorator as (value, context).
  if (typeof a === "function" && b && typeof b === "object" && b.kind === "class") {
    applyService(a);
    return; // returning nothing leaves the class as it is
  }
  // Factory use: @service("Name")
  const name = a as string | undefined;
  return (ctor: any) => { applyService(ctor, name); };
}

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
export function factory(key?: unknown) {
  return (method: Function, context: ClassMethodDecoratorContext): void => {
    const methodName = String(context.name);
    // Register the raw method at define time so ordering is unchanged...
    app.registerFactory(key, { method: methodName, fn: method });
    // ...then rebind to the live instance once the owning @service is
    // constructed. start() invoked these as a bare `await fn()`, so `this` was
    // undefined and any factory touching an @inject accessor threw. Mirrors
    // how @guard rebinds (router/decorators.ts).
    context.addInitializer(function (this: unknown) {
      app.rebindFactory(method, method.bind(this));
    });
  };
}
