/**
 * Loom Store — Barrel exports
 *
 * Reactive primitives, storage adapters, and store decorators.
 */

// Reactive primitives
export { Reactive, CollectionStore } from "./reactive";
export type { Subscriber, Updater, Identifiable } from "./reactive";

// Storage adapters
export { MemoryStorage, LocalAdapter, SessionAdapter, LocalMedium, SessionMedium } from "./storage";
export type { StorageAdapter, StorageMedium, PersistOptions } from "./storage";

// Decorators
export { reactive, prop, computed, params, routeQuery, store } from "./decorators";
export { readonly } from "./readonly";

// Watch
export { watch } from "./watch";

// TC39 Signals interop
export { SignalState, SignalComputed, toSignal, fromSignal, signal } from "./signal";
export type { Signal, SignalOptions } from "./signal";
