/**
 * Loom — Decorators
 *
 * Barrel re-export for the full decorator arsenal:
 * @component, @prop, @reactive, @computed, @on, @watch, @emit,
 * @query, @queryAll, @catch_, @suspend, @mount, @unmount,
 * @interval, @timeout, @animationFrame, @service, @inject, @factory
 */

// Symbols (consumed by LoomElement and App)
export {
  REACTIVES,
  PROPS,
  ON_HANDLERS,
  WATCHERS,
  EMITTERS,
  COMPUTED_DIRTY,
  CATCH_HANDLER,
  MOUNT_HANDLERS,
  UNMOUNT_HANDLERS,
  INJECT_PARAMS,
  ROUTE_PROPS,
  TRANSFORMS,
} from "./symbols";

// Component registration
export { component } from "./component";

// State management
export { reactive, prop, computed, params, routeQuery } from "./state";

// Type conversion
export { transform, typed } from "./transform";

// Event system
export { on, watch, emit } from "./events";

// DOM queries
export { query, queryAll } from "./dom";

// Lifecycle & error boundaries
export { catch_, suspend, mount, unmount } from "./lifecycle";

// Timers & animation
export { interval, timeout, animationFrame } from "./timing";

// Dependency injection
export { service, inject, factory } from "./di";
