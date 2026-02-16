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
export { reactive, prop, computed, params, routeQuery } from "./decorators";

// Watch
export { watch } from "./watch";
