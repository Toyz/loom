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

// App entry point + DI
export { app, service, inject, maybe, factory, resolveServiceName } from "./app.js";
export type { LoomApp } from "./app.js";

// HTML entity decoder
export { text } from "./text.js";

// Event system
export { LoomEvent } from "./event.js";
export { EventBus, bus, useBus } from "./bus.js";
export type { Constructor, Handler } from "./bus.js";

// CSS
export { css, cssText, isLazySheet, toSheet } from "./css.js";
export type { LazyStyleSheet } from "./css.js";
export type { CSSValue } from "./css.js";

// DOM morphing
export { morph, LOOM_KEY_ATTR } from "./morph.js";

// JSX runtime (re-exported so jsxImportSource resolves)
export { jsx, jsxs, Fragment } from "./jsx-runtime.js";

// Render loop
export { renderLoop } from "./render-loop.js";
export type { RenderLoop } from "./render-loop.js";

// ── Store (core only — adapters & route sentinels via @toyz/loom/store) ──

export { reactive, prop, computed, watch, store, persist } from "./store/index.js";

// ── Element: base class + core decorators ──

export {
  LoomElement,
  LoomAttribute, attribute, observeAttributes,
  component, query, queryAll, styles, dynamicCss,
  type LoomHtmlQuery, type LoomHtmlQueryAll,
  catch_, suspend, mount, unmount,
  event, observer,
  interval, timeout, debounce, throttle, animationFrame, idle,
  // ElementInternals: form association, :state(), ARIA reflection
  state, aria, formValue, validity, revalidate,
  checkValidity, reportValidity, validationMessage, formOf,
  // Native top layer
  popover, dialog,
  // Environment
  visible, online,
  // View transitions and animation
  viewTransition, startViewTransition, transitionName, animate,
  // Long-lived connections
  sse, socket,
  // Device and selection
  geolocation, wakeLock, share, canShare, selection, highlight, findRanges,
} from "./element/index.js";

// ── Decorators: event decorators + factory ──

export { on, emit, createDecorator, createSymbol, LoomSymbol, SYMBOL_REGISTRY } from "./decorators/index.js";

// Result type
export { LoomResult } from "./result.js";

// Design tokens — declare a value once, use it as var() everywhere
export { tokens } from "./tokens.js";
export type { Tokens } from "./tokens.js";

// Lifecycle interface for DI services
export type { LoomLifecycle } from "./lifecycle.js";

// Environment signals — shared visibility/online state
export { isVisible, onVisibilityChange, isOnline, onOnlineChange } from "./env.js";
