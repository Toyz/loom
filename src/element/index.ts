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
// e.g. import { LoomCanvas } from "@toyz/loom/element/canvas"

// Element decorators
export { component, query, queryAll, styles } from "./decorators";

// Lifecycle decorators
export { catch_, suspend, mount, unmount } from "./lifecycle";

// Timing decorators
export { interval, timeout, debounce, throttle, animationFrame } from "./timing";

// Form decorator
export { form } from "./form";
export type { FormState, FormSchema, FieldSchema } from "./form";

// Lazy loading decorator
export { lazy } from "./lazy";
export type { LazyOptions } from "./lazy";

// Slot decorator
export { slot } from "./slots";

// Transition decorator
export { transition } from "./transition";
export type { TransitionOptions } from "./transition";
