/**
 * Loom Store — Barrel exports
 *
 * Reactive primitives, storage adapters, and store decorators.
 */

// Reactive primitives
export { Reactive, CollectionStore } from "./reactive.js";
export type { Subscriber, Updater, Identifiable } from "./reactive.js";

// Storage adapters
export { MemoryStorage, LocalAdapter, SessionAdapter, LocalMedium, SessionMedium } from "./storage.js";
export type { StorageAdapter, StorageMedium, PersistOptions } from "./storage.js";

// Decorators
export { reactive, prop, computed, params, routeQuery, store, persist } from "./decorators.js";
export { readonly } from "./readonly.js";

// Watch
export { watch } from "./watch.js";

// TC39 Signals interop
export { SignalState, SignalComputed, toSignal, fromSignal, signal } from "./signal.js";
export type { Signal, SignalOptions } from "./signal.js";

// IndexedDB-backed persistence (async write-behind, sync reads)
export { IndexedDBAdapter } from "./storage.js";
