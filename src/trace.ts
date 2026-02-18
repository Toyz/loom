/**
 * Loom — Traced Template Projection
 *
 * Phase 1: Dependency tracking for update().
 *   - Traces which Reactive instances are read during update()
 *   - On subsequent scheduleUpdate() calls, checks if any tracked
 *     dependency actually changed before running update()+morph().
 *   - Eliminates unnecessary renders when unrelated state changes.
 *
 * Phase 2 (future): Fine-grained DOM patching.
 *   - With compiler support, individual expressions could be traced
 *     to specific DOM positions, enabling O(D) targeted patches.
 */

import type { Reactive } from "./store/reactive";

// ── Types ──

/** Dependency set: the Reactives that were read during a single update() call */
export interface TraceDeps {
  /** Set of Reactives read during the traced update() */
  deps: Set<Reactive<any>>;
  /** Snapshot of each dependency's version at trace time */
  versions: Map<Reactive<any>, number>;
}

// ── Tracer state (module-scoped) ──

let activeDeps: Set<Reactive<any>> | null = null;

// ── Public API ──

/**
 * Begin tracing. Called before update().
 * All Reactive.value reads will be recorded.
 */
export function startTrace(): void {
  activeDeps = new Set();
}

/**
 * End tracing and return the dependency set + version snapshots.
 * Called after update() completes.
 */
export function endTrace(): TraceDeps {
  const deps = activeDeps ?? new Set();
  activeDeps = null;

  // Snapshot current versions for dirty checking
  const versions = new Map<Reactive<any>, number>();
  for (const r of deps) {
    versions.set(r, r.peekVersion());
  }

  return { deps, versions };
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
 * Update the snapshot versions to current.
 * Called after a successful update()+morph().
 */
export function refreshSnapshots(trace: TraceDeps): void {
  for (const r of trace.deps) {
    trace.versions.set(r, r.peekVersion());
  }
}
