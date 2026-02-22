/**
 * Loom — Traced Template Projection
 *
 * Phase 1: Dependency tracking for update().
 *   - Traces which Reactive instances are read during update()
 *   - On subsequent scheduleUpdate() calls, checks if any tracked
 *     dependency actually changed before running update()+morph().
 *   - Eliminates unnecessary renders when unrelated state changes.
 *
 * Phase 2: Fine-grained DOM patching via Closure Bindings.
 *   - During traced update(), function children/props are executed
 *     within a sub-trace to capture their specific dependencies.
 *   - A Binding is created linking those dependencies to the DOM node.
 *   - On subsequent updates, if all dirty deps have bindings,
 *     the element fast-patches those DOM nodes directly.
 */

import type { Reactive } from "./store/reactive";

// ── Types ──

/** A single Reactive→DOM binding created during traced update() */
export interface Binding {
  /** The set of reactives that trigger this binding */
  reactives: Set<Reactive<any>>;
  /** The DOM node to patch */
  target: Node | Element;
  /** The closure that updates the DOM (re-evaluates the binding) */
  patcher: () => void;
}

/** Dependency set: the Reactives that were read during a single update() call */
export interface TraceDeps {
  /** Set of Reactives read during the traced update() */
  deps: Set<Reactive<any>>;
  /** Snapshot of each dependency's version at trace time */
  versions: Map<Reactive<any>, number>;
  /** Phase 2 — Reactive→DOM bindings for fast-patching */
  bindings: Map<Reactive<any>, Binding[]>;
}

// ── Tracer state (module-scoped) ──

/**
 * The current set of dependencies being tracked.
 * When nested tracing occurs, the parent set is pushed to `traceStack`.
 */
let activeDeps: Set<Reactive<any>> | null = null;

/** Getter for direct inline access by Reactive.value — avoids 2 function calls (isTracing+recordRead) reduced to 1 */
export function __getActiveDeps(): Set<Reactive<any>> | null { return activeDeps; }

/** Stack of dependency sets for nested tracing (e.g. inside a binding closure) */
let traceStack: Set<Reactive<any>>[] = [];

/** Active bindings being collected during a traced update() */
let activeBindings: Map<Reactive<any>, Binding[]> | null = null;

/** Monotonic generation counter for applyBindings dedup */
let _applyGen = 0;

// ── Pooled data structures for zero-alloc tracing ──

const _depsPool: Set<Reactive<any>>[] = [];
const _versionsPool: Map<Reactive<any>, number>[] = [];
const _bindingsPool: Map<Reactive<any>, Binding[]>[] = [];

function acquireSet(): Set<Reactive<any>> {
  return _depsPool.pop() ?? new Set();
}
function acquireVersions(): Map<Reactive<any>, number> {
  return _versionsPool.pop() ?? new Map();
}
function acquireBindings(): Map<Reactive<any>, Binding[]> {
  return _bindingsPool.pop() ?? new Map();
}

/**
 * Begin tracing. Called before update().
 * All Reactive.value reads will be recorded.
 */
export function startTrace(): void {
  activeDeps = acquireSet();
  traceStack.length = 0;
  activeBindings = acquireBindings();
}

/**
 * End tracing and return the dependency set + version snapshots + bindings.
 * Called after update() completes.
 */
export function endTrace(): TraceDeps {
  const deps = activeDeps ?? acquireSet();
  activeDeps = null;

  // Snapshot current versions for dirty checking
  const versions = acquireVersions();
  for (const r of deps) {
    versions.set(r, r.peekVersion());
  }

  const bindings = activeBindings ?? acquireBindings();
  activeBindings = null;
  traceStack.length = 0;

  return { deps, versions, bindings };
}

/**
 * Check if tracing is currently active.
 */
export function isTracing(): boolean {
  return activeDeps !== null;
}

/**
 * Record a Reactive read. Called from Reactive.value getter
 * when a trace is active.
 */
export function recordRead(reactive: Reactive<any>): void {
  if (activeDeps) {
    activeDeps.add(reactive);
  }
}

/**
 * Start a sub-trace for a closure binding.
 * Pushes the current activeDeps to the stack and starts a fresh set.
 */
export function startSubTrace(): void {
  if (activeDeps) {
    traceStack.push(activeDeps);
  }
  activeDeps = acquireSet();
}

/**
 * End a sub-trace and return the captured dependencies.
 * Merges the captured deps back into the parent trace (so the component remains dirty).
 */
export function endSubTrace(): Set<Reactive<any>> {
  const captured = activeDeps ?? acquireSet();
  activeDeps = traceStack.pop() || null;

  // Merge sub-trace deps into parent trace
  if (activeDeps) {
    captured.forEach(r => activeDeps!.add(r));
  }

  return captured;
}

/**
 * Register a Reactive→DOM binding.
 * Called by the JSX runtime when a closure binding is detected.
 */
export function addBinding(
  reactives: Set<Reactive<any>>,
  target: Node | Element,
  patcher: () => void,
): void {
  if (!activeBindings) return;

  const binding: Binding = { reactives, target, patcher };

  // Register this binding for every reactive it depends on
  reactives.forEach(r => {
    let list = activeBindings!.get(r);
    if (!list) {
      list = [];
      activeBindings!.set(r, list);
    }
    list.push(binding);
  });
}

/**
 * Check if any dependency in the trace has changed since the snapshot.
 * Returns true if at least one dependency's version differs.
 * Returns true if trace is null (first render, always dirty).
 */
export function hasDirtyDeps(trace: TraceDeps | null): boolean {
  if (!trace) return true;
  for (const [r, ver] of trace.versions) {
    if (r.peekVersion() !== ver) return true;
  }
  return false;
}

/**
 * Check if all dirty dependencies have bindings — if so, we can
 * fast-patch the DOM without running update()+morph().
 * Returns false for null trace or if any dirty dep has no binding.
 */
export function canFastPatch(trace: TraceDeps | null): boolean {
  if (!trace) return false;
  if (trace.bindings.size === 0) return false;

  for (const [r, ver] of trace.versions) {
    if (r.peekVersion() !== ver) {
      // This dep is dirty — does it have bindings?
      if (!trace.bindings.has(r)) return false;
    }
  }
  return true;
}

/**
 * Apply all dirty bindings.
 * Only patches bindings for deps that actually changed.
 * Uses a Set to deduplicate patchers (one binding might depend on multiple changed reactives).
 */
export function applyBindings(trace: TraceDeps): void {
  // Monotonic generation counter for per-call dedup (avoids Set allocation)
  const gen = ++_applyGen;
  const toRun: Array<() => void> = [];

  for (const [r, ver] of trace.versions) {
    if (r.peekVersion() !== ver) {
      const bindings = trace.bindings.get(r);
      if (bindings) {
        for (let i = 0; i < bindings.length; i++) {
          const p = bindings[i].patcher;
          if ((p as any).__ran !== gen) {
            (p as any).__ran = gen;
            toRun.push(p);
          }
        }
      }
    }
  }

  // Execute unique patchers
  for (let i = 0; i < toRun.length; i++) {
    toRun[i]();
  }
}

/**
 * Update the snapshot versions to current.
 * Called after a successful update()+morph() or fast-patch.
 */
export function refreshSnapshots(trace: TraceDeps): void {
  for (const r of trace.deps) {
    trace.versions.set(r, r.peekVersion());
  }
}
