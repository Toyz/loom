/**
 * Loom Element — Barrel exports
 *
 * LoomElement base class, built-in elements, and element decorators.
 */

// Base element
export { LoomElement } from "./element";

// Built-in elements — import explicitly to opt-in to side effects
// e.g. import { LoomVirtual } from "@toyz/loom/element/virtual"
// e.g. import { LoomIcon } from "@toyz/loom/element/icon"
export type { VirtualListOptions } from "./virtual";

// Element decorators
export { component, query, queryAll } from "./decorators";

// Lifecycle decorators
export { catch_, suspend, mount, unmount } from "./lifecycle";

// Timing decorators
export { interval, timeout, debounce, throttle, animationFrame } from "./timing";
