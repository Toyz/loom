/**
 * Loom — TC39 Signals Interop
 *
 * Bridges TC39 Signals (Signal.State / Signal.Computed) with Loom's
 * real-DOM reactive system. Loom doesn't use a VDOM — it patches the
 * real DOM via morphing and fast-patch bindings. The trace engine
 * tracks which Reactive instances are read during update().
 *
 * This module provides:
 *
 *   SignalState<T>    — A Signal.State-compatible wrapper around Reactive<T>.
 *                       `.get()` integrates with Loom's trace engine.
 *
 *   SignalComputed<T> — A Signal.Computed-compatible lazy derivation.
 *                       Uses backing Reactive for trace integration.
 *
 *   toSignal(r)       — Wrap an existing Reactive<T> as a Signal.
 *   fromSignal(s)     — Wrap an external Signal as a Reactive<T> for Loom.
 *
 * Why this matters for real DOM:
 *   Loom's trace engine intercepts Reactive.value reads to build a
 *   dependency graph. When a dependency changes, only the affected
 *   DOM nodes are patched (fast-patch) or the component re-morphs.
 *   Signals need to participate in this same tracking to work
 *   seamlessly with @reactive, @computed, @store, and @watch.
 *
 * How it works with real DOM (morph engine):
 *   1. Component.update() runs inside a startTrace()/endTrace() block
 *   2. Any SignalState.get() → Reactive.value → recorded as a dependency
 *   3. When SignalState.set() fires → Reactive.set() → version bumps
 *   4. Next scheduleUpdate() → hasDirtyDeps() sees changed version
 *   5. Morph engine patches only the changed DOM nodes
 *
 *   For closure bindings ({() => counter.get()}), the fast-patch path
 *   re-evaluates just that binding's patcher — no full morph needed.
 */

import { Reactive, type Subscriber } from "./reactive";
import { startSubTrace, endSubTrace } from "../trace";
import { REACTIVES, WATCHERS, EMITTERS, localSymbol } from "../decorators/symbols";
import { bus } from "../bus";
import type { Schedulable } from "../element/element";

// ── TC39-compatible Signal interface ──

/** Matches the TC39 Signal interface — read-only `.get()` */
export interface Signal<T> {
  get(): T;
}

/** Options for Signal construction, matching TC39 SignalOptions */
export interface SignalOptions<T> {
  equals?: (a: T, b: T) => boolean;
}

// ── SignalState<T> ──

/**
 * A read-write Signal backed by Loom's Reactive<T>.
 * Reads via `.get()` participate in Loom's trace engine,
 * so components that read this signal during update() will
 * automatically re-render when the value changes.
 *
 * ```ts
 * const count = new SignalState(0);
 * count.get();  // 0 — tracked by trace engine
 * count.set(1); // triggers re-render of dependent components
 * ```
 */
export class SignalState<T> implements Signal<T> {
  /** @internal — the backing Reactive, exposed for Loom internals */
  readonly _reactive: Reactive<T>;
  private _equals: (a: T, b: T) => boolean;

  constructor(initial: T, options?: SignalOptions<T>) {
    this._reactive = new Reactive<T>(initial);
    this._equals = options?.equals ?? Object.is;
  }

  /** Read the value — integrates with Loom's trace engine */
  get(): T {
    return this._reactive.value; // .value triggers __getActiveDeps()
  }

  /** Write a new value — triggers subscribers + scheduleUpdate */
  set(value: T): void {
    if (this._equals(this.peek(), value)) return;
    this._reactive.set(value);
  }

  /** Read without trace tracking */
  peek(): T {
    return this._reactive.peek();
  }

  /** Subscribe to changes (Loom extension) */
  subscribe(fn: Subscriber<T>): () => void {
    return this._reactive.subscribe(fn);
  }
}

// ── SignalComputed<T> ──

/**
 * A read-only computed Signal. Lazily evaluates a callback,
 * caches the result, and integrates with Loom's trace engine.
 *
 * Dependencies are tracked automatically: the callback runs inside a
 * sub-trace, so any SignalState.get() or Reactive.value access it performs is
 * recorded. When those dependencies change, the cached value is invalidated.
 * This works standalone as well as inside a component's update().
 *
 * The backing Reactive participates in Loom's trace engine,
 * so components reading this computed will re-render when it
 * recomputes to a different value.
 *
 * ```ts
 * const count = new SignalState(2);
 * const doubled = new SignalComputed(() => count.get() * 2);
 * doubled.get(); // 4 — tracked, lazy, memoized
 * count.set(3);
 * doubled.get(); // 6 — re-evaluated because count changed
 * ```
 */
export class SignalComputed<T> implements Signal<T> {
  /** @internal — Reactive backing for trace integration */
  readonly _reactive: Reactive<T>;
  private _cb: () => T;
  private _dirty = true;
  private _unsubs: (() => void)[] = [];
  private _equals: (a: T, b: T) => boolean;

  constructor(cb: () => T, options?: SignalOptions<T>) {
    this._cb = cb;
    this._equals = options?.equals ?? Object.is;
    // Initialize with a placeholder; first .get() evaluates
    this._reactive = new Reactive<T>(undefined as T);
  }

  /** Read the computed value — lazy, memoized, trace-integrated */
  get(): T {
    if (this._dirty) {
      this._recompute();
    }
    // Register in trace engine via Reactive.value
    return this._reactive.value;
  }

  /** Read without trace tracking */
  peek(): T {
    if (this._dirty) {
      this._recompute();
    }
    return this._reactive.peek();
  }

  /** Subscribe to changes (Loom extension) */
  subscribe(fn: Subscriber<T>): () => void {
    // Ensure we've computed at least once so subscription is meaningful
    if (this._dirty) this._recompute();
    return this._reactive.subscribe(fn);
  }

  /** Dispose all subscriptions — prevents memory leaks */
  dispose(): void {
    for (let i = 0; i < this._unsubs.length; i++) this._unsubs[i]();
    this._unsubs.length = 0;
  }

  private _recompute(): void {
    // Tear down old dependency subscriptions
    this.dispose();

    // Run the callback under its OWN sub-trace.
    //
    // This used to read __getActiveDeps() — the *parent* trace — which was
    // wrong twice over: with no trace active it captured nothing at all, so a
    // standalone computed never invalidated and `.get()` returned the first
    // value forever; and inside a component's update() it captured every
    // Reactive the component had read, not just the ones the callback touched.
    //
    // endSubTrace() also merges the captured deps back into the parent trace,
    // so a component reading `computed.get()` still tracks the sources
    // transitively.
    let newValue: T;
    let captured: Set<Reactive<any>>;
    startSubTrace();
    try {
      newValue = this._cb();
    } finally {
      captured = endSubTrace();
    }

    // Subscribe to the callback's own deps for invalidation
    for (const dep of captured) {
      const unsub = dep.subscribe(() => {
        if (this._dirty) return;
        this._dirty = true;
        // _recompute()'s set() already bumps the version and notifies
        // subscribers when the value actually changed — an extra notify()
        // here made every downstream @watch/@emit fire twice per change.
        this._recompute();
      });
      this._unsubs.push(unsub);
    }

    // Clear the dirty flag BEFORE set(): a subscriber that reads .get() from
    // inside the notify would otherwise re-enter _recompute() forever.
    this._dirty = false;

    const prev = this._reactive.peek();
    if (!this._equals(prev, newValue)) {
      this._reactive.set(newValue);
    }
  }
}

// ── Converters ──

/**
 * Wrap an existing Reactive<T> as a TC39-compatible Signal.
 * The returned SignalState shares the same backing Reactive,
 * so reads and writes are fully synchronized.
 *
 * ```ts
 * const count = new Reactive(0);
 * const sig = toSignal(count);
 * sig.get(); // 0 — reads from same Reactive
 * sig.set(5); // count.value is now 5
 * ```
 */
export function toSignal<T>(reactive: Reactive<T>): SignalState<T> {
  const sig = Object.create(SignalState.prototype) as SignalState<T>;
  // Directly share the backing Reactive — zero overhead
  Object.defineProperty(sig, '_reactive', { value: reactive, writable: false });
  Object.defineProperty(sig, '_equals', { value: Object.is, writable: false });
  return sig;
}

/**
 * Wrap an external Signal (TC39-compatible) as a Loom Reactive<T>.
 * The returned Reactive can be used with @watch, trace engine,
 * component rendering, etc.
 *
 * Since external Signals may not have subscribe(), you must provide
 * a `subscribe` callback that hooks into your framework's effect system.
 *
 * ```ts
 * // With external framework's effect
 * const r = fromSignal(externalSignal, (onChange) => {
 *   return myFramework.effect(() => {
 *     externalSignal.get(); // track
 *     onChange();            // notify Loom
 *   });
 * });
 * ```
 */
export function fromSignal<T>(
  signal: Signal<T>,
  subscribe?: (onChange: () => void) => () => void,
): Reactive<T> {
  const r = new Reactive<T>(signal.get());

  if (subscribe) {
    subscribe(() => {
      const newVal = signal.get();
      if (!Object.is(r.peek(), newVal)) {
        r.set(newVal);
      }
    });
  }

  return r;
}

// ── @signal decorator ──

/**
 * TC39 Signal-compatible reactive accessor.
 * Works like `@reactive` but the accessor value is read/written
 * through a `SignalState<T>` under the hood.
 *
 * The accessor surface exposes the raw value (for ergonomics),
 * compatible with templates: `{() => this.count}`.
 * For Signal interop, the backing `SignalState` is exposed as
 * `this.$signal_<field>` so external Signal-based code can use
 * `.get()` / `.set()` / `.peek()`.
 *
 * Integrates with `@watch`, `@emit`, `scheduleUpdate()`, and
 * Loom's trace engine (morph + fast-patch).
 *
 * ```ts
 * @component("my-counter")
 * class Counter extends LoomElement {
 *   @signal accessor count = 0;
 *
 *   update() {
 *     return <span>{() => this.count}</span>;
 *   }
 *
 *   increment() {
 *     this.count++;
 *     // Or via Signal API:
 *     // this.$signal_count.set(this.$signal_count.get() + 1);
 *   }
 * }
 * ```
 */
export function signal<This extends object, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const key = String(context.name);
  const storage = localSymbol<SignalState<V>>(`signal:${key}`);

  // Register as a reactive field for LoomElement introspection
  context.addInitializer(function () {
    const ctor = this!.constructor as object;
    const fields = REACTIVES.ownArray<string>(ctor);
    if (!fields.includes(key)) fields.push(key);
  });

  return {
    get(this: This): V {
      const self = this as unknown as Record<symbol | string, unknown>;
      if (!self[storage.key]) {
        const initial = target.get.call(this) as V;
        const sig = new SignalState<V>(initial);
        self[storage.key] = sig;

        // Expose the SignalState on the instance
        self[`$signal_${key}`] = sig;

        // Wire scheduleUpdate
        sig.subscribe(() => (self as unknown as Schedulable).scheduleUpdate?.());

        // Wire @watch handlers
        const watchers = WATCHERS.from(self) as Array<{ field: string; key: string }> | undefined;
        if (watchers) {
          for (let i = 0; i < watchers.length; i++) {
            const w = watchers[i];
            if (w.field === key) sig.subscribe((v: V, prev: V) => (self[w.key] as Function)(v, prev));
          }
        }

        // Wire @emit handlers
        const emitters = EMITTERS.from(self) as Array<{ field: string; factory: (v: V) => object }> | undefined;
        if (emitters) {
          for (let i = 0; i < emitters.length; i++) {
            const e = emitters[i];
            if (e.field === key) sig.subscribe((v: V) => bus.emit(e.factory(v) as import("../event").LoomEvent));
          }
        }
      }
      return (self[storage.key] as SignalState<V>).get();
    },
    set(this: This, val: V) {
      const self = this as unknown as Record<symbol | string, unknown>;
      if (!self[storage.key]) void (self as Record<string, unknown>)[key];
      (self[storage.key] as SignalState<V>).set(val);
    },
    init(this: This, _val: V): V {
      return _val;
    },
  };
}
