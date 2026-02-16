/**
 * Loom — Barrel exports
 *
 * Import everything from "loom":
 * import { EventBus, LoomEvent, Reactive, LoomElement, component, ... } from "loom";
 */

// App entry point
export { app } from "./app";
export type { LoomApp } from "./app";
// Event system
export { LoomEvent } from "./event";
export { EventBus, bus, useBus } from "./bus";
export type { Constructor, Handler } from "./bus";

// Reactive stores
export { Reactive, CollectionStore } from "./reactive";
export type { Subscriber, Updater, Identifiable } from "./reactive";

// Storage mediums
export { MemoryStorage, LocalMedium, SessionMedium } from "./storage";
export type { StorageMedium, PersistOptions } from "./storage";

// CSS
export { css } from "./css";
export type { CSSValue } from "./css";

// Element base
export { LoomElement } from "./element";

// DOM morphing
export { morph } from "./morph";

// Decorators
export {
  component,
  prop,
  reactive,
  computed,
  on,
  watch,
  emit,
  query,
  queryAll,
  catch_,
  suspend,
  mount,
  unmount,
  interval,
  timeout,
  animationFrame,
  service,
  inject,
  factory,
  params,
  routeQuery,
  transform,
  typed,
} from "./decorators";

// JSX runtime (re-exported so jsxImportSource resolves)
export { jsx, jsxs, Fragment } from "./jsx-runtime";

// Render loop
export { renderLoop } from "./render-loop";
export type { RenderLoop } from "./render-loop";

// Icon
export { LoomIcon } from "./icon";

// Virtual list
export { LoomVirtual } from "./virtual";
export type { VirtualListOptions } from "./virtual";

// Router
export {
  LoomRouter,
  RouteChanged,
  route,
  guard,
  matchRoute,
  routes,
  LoomOutlet,
  LoomLink,
  HashMode,
  HistoryMode,
} from "./router";
export type { RouterMode, RouterOptions, RouteInfo, RouteEntry } from "./router";

