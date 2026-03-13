/**
 * Loom — Barrel exports (slim)
 *
 * Core essentials only. Heavy modules use subpath imports:
 *   @toyz/loom/router    — LoomRouter, route, guard, LoomOutlet, LoomLink, etc.
 *   @toyz/loom/store     — Reactive, CollectionStore, storage adapters, params, routeQuery
 *   @toyz/loom/di        — service, inject, factory
 *   @toyz/loom/transform — transform, typed, toNumber, toBoolean, etc.
 *   @toyz/loom/element   — form, lazy, slot, transition, hotkey, portal, log, provide, consume, etc.
 *   @toyz/loom/query     — api, intercept, createApiState
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

// ── Store (core only — adapters & route sentinels via @toyz/loom/store) ──

export { reactive, prop, computed, watch, store } from "./store";

// ── Element: base class + core decorators ──

export {
  LoomElement,
  component, query, queryAll, styles, dynamicCss,
  type LoomHtmlQuery, type LoomHtmlQueryAll,
  catch_, suspend, mount, unmount,
  event, observer,
  interval, timeout, debounce, throttle, animationFrame,
} from "./element";

// ── Decorators: event decorators + factory ──

export { on, emit, createDecorator, createSymbol, LoomSymbol, SYMBOL_REGISTRY } from "./decorators";

// Result type
export { LoomResult } from "./result";

// Lifecycle interface for DI services
export type { LoomLifecycle } from "./lifecycle";

