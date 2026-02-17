/**
 * Loom — Barrel exports
 *
 * Import everything from "@toyz/loom":
 * import { EventBus, LoomEvent, Reactive, LoomElement, component, ... } from "@toyz/loom";
 */

// App entry point
export { app } from "./app";
export type { LoomApp } from "./app";

// Event system
export { LoomEvent } from "./event";
export { EventBus, bus, useBus } from "./bus";
export type { Constructor, Handler } from "./bus";

// CSS
export { css } from "./css";
export type { CSSValue } from "./css";

// DOM morphing
export { morph } from "./morph";

// JSX runtime (re-exported so jsxImportSource resolves)
export { jsx, jsxs, Fragment } from "./jsx-runtime";

// Render loop
export { renderLoop } from "./render-loop";
export type { RenderLoop } from "./render-loop";

// ── Domain re-exports ──

// Store: reactive state, persistence
export {
  Reactive, CollectionStore,
  MemoryStorage, LocalAdapter, SessionAdapter, LocalMedium, SessionMedium,
  reactive, prop, computed, params, routeQuery,
  watch,
  store,
} from "./store";
export type {
  Subscriber, Updater, Identifiable,
  StorageAdapter, StorageMedium, PersistOptions,
} from "./store";

// DI: service container decorators
export { service, inject, factory } from "./di";
export { watch as watchService } from "./di";

// Element: base class, element decorators
export {
  LoomElement,
  component, query, queryAll, styles,
  catch_, suspend, mount, unmount,
  interval, timeout, debounce, throttle, animationFrame,
  form, lazy, slot, transition,
} from "./element";
export type { VirtualListOptions, FormState, FormSchema, FieldSchema, LazyOptions, TransitionOptions } from "./element";

// Transform: value transforms
export {
  transform, createTransform,
  typed, typedTransformer,
  toNumber, toBoolean, toDate, toJSON, toTrimmed, toInt, toFloat,
} from "./transform";
export type { TransformSchema } from "./transform";

// Decorators: event decorators + factory
export { on, emit, createDecorator } from "./decorators";

// Router
export {
  LoomRouter,
  RouteChanged,
  route,
  guard,
  group,
  matchRoute,
  routes,
  LoomOutlet,
  LoomLink,
  HashMode,
  HistoryMode,
  onRouteEnter,
  onRouteLeave,
} from "./router";
export type { RouterMode, RouterOptions, RouteInfo, RouteEntry, GroupMeta } from "./router";
