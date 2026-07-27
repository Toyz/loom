/**
 * Loom — Decorators
 *
 * Barrel re-export for the full decorator arsenal.
 * Re-exports from domain folders so imports from "@toyz/loom/decorators" still work.
 */

// Symbols (consumed by LoomElement and App)
export {
  LoomSymbol,
  REACTIVES,
  PROPS,
  WATCHERS,
  EMITTERS,
  COMPUTED_DIRTY,
  CATCH_HANDLER,
  INJECT_PARAMS,
  ON_HANDLERS,
  ROUTE_PROPS,
  TRANSFORMS,
  SERVICE_NAME,
  createSymbol,
  SYMBOL_REGISTRY,
} from "./symbols.js";

// Decorator factory (public API for user-defined decorators)
export { createDecorator } from "./create.js";

// Event system (stays in decorators/)
export { on, emit } from "./events.js";

// ── Re-exports from domain folders ──

// Store: reactive state, persistence, @watch(field/store)
export { reactive, prop, computed, params, routeQuery, watch } from "../store/index.js";
export { readonly } from "../store/index.js";

// DI: service container decorators, @watch(Service)
export { service, inject, factory } from "../di/index.js";
/** @deprecated Use `@watch(Service)` or `@watch(Service, "prop")` instead. Will be removed in v1.0. */
export { watch as watchService } from "../di/index.js";

// Element: component registration, DOM queries, lifecycle, timing
export { component, query, queryAll } from "../element/index.js";
export { catch_, suspend, mount, unmount } from "../element/index.js";
export { interval, timeout, debounce, throttle, animationFrame } from "../element/index.js";
export { hotkey } from "../element/index.js";
export { log, LogTransport, ConsoleTransport } from "../element/index.js";

// Transform: value transforms, factory, typed helpers
export { transform, createTransform, typed, typedTransformer } from "../transform/index.js";
export { toNumber, toBoolean, toDate, toJSON, toTrimmed, toInt, toFloat } from "../transform/index.js";
