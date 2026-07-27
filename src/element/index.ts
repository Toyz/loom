/**
 * Loom Element — Barrel exports
 *
 * LoomElement base class, built-in elements, and element decorators.
 */

// Base element
export { LoomElement } from "./element.js";

// Base attribute controller — custom attributes (directives)
export { LoomAttribute, attribute, observeAttributes } from "./attribute.js";
export type { AttributeOptions, PortalTarget } from "./attribute.js";

// Built-in elements — import explicitly to opt-in to side effects
// e.g. import { LoomVirtual } from "@toyz/loom/element/virtual"
// e.g. import { LoomIcon } from "@toyz/loom/element/icon"
// e.g. import { LoomCanvas } from "@toyz/loom/element/canvas"
// e.g. import { LoomImage } from "@toyz/loom/element/image"

// Element decorators
export { component, query, queryAll, styles, dynamicCss, type LoomHtmlQuery, type LoomHtmlQueryAll } from "./decorators.js";

// Lifecycle decorators
export { catch_, suspend, mount, unmount } from "./lifecycle.js";

// Event decorator
export { event } from "./events.js";

// Observer decorator
export { observer } from "./observers.js";

// Timing decorators
export { interval, timeout, debounce, throttle, animationFrame, idle, type AnimationFrameOptions } from "./timing.js";

// Form decorator
export { form } from "./form.js";
export type { FormState, FormSchema, FieldSchema } from "./form.js";

// Lazy loading decorator
export { lazy } from "./lazy.js";
export type { LazyOptions } from "./lazy.js";
export { LazyLoadStart, LazyLoadEnd } from "./lazy-events.js";

// Slot decorator
export { slot } from "./slots.js";

// Transition decorator
export { transition } from "./transition.js";
export type { TransitionOptions } from "./transition.js";

// Hotkey decorator
export { hotkey, hotkeyLabel, hotkeyLabels } from "./hotkey.js";
export type { HotkeyOptions, HotkeyCombo, HotkeyLabelled } from "./hotkey.js";

// Log decorator + transport
export { log, LogTransport, ConsoleTransport, resetLogTransport } from "./log.js";
export type { LogEntry, LogLevel, LogOptions } from "./log.js";

// Context: provide/consume across shadow boundaries
export { provide, consume, ContextRequestEvent } from "./context.js";
export type { ContextCallback } from "./context.js";

// Portal: teleport content to external DOM targets
export { portal } from "./portal.js";
export type { PortalOptions } from "./portal.js";

// Media: reactive media query binding
export { media } from "./media.js";
export { permission, Permission, PermissionState, isGranted, isBlocked, willPrompt, canAttempt } from "./permission.js";
export type { LoomPermissionState, PermissionKey, PermissionNameLike } from "./permission.js";

// Fullscreen: toggle fullscreen API
export { fullscreen } from "./fullscreen.js";
export type { FullscreenOptions } from "./fullscreen.js";

// Clipboard: declarative copy/paste
export { clipboard } from "./clipboard.js";

// Drag & Drop: declarative DnD
export { draggable, dropzone } from "./dnd.js";
export type { DraggableOptions, DropzoneOptions } from "./dnd.js";

// ElementInternals: custom states, ARIA reflection
export { state, aria, setState, hasState, setAria, internalsFor, supportsInternals } from "./internals.js";
export type { LoomInternals, AriaProps, FormValue } from "./internals.js";

// Form-associated custom elements: participate in a native <form>
export {
  formValue, validity, revalidate, makeFormAssociated,
  formOf, checkValidity, reportValidity, validationMessage,
} from "./form-associated.js";
export type { Validator } from "./form-associated.js";

// View Transitions: animate a full render through document.startViewTransition
export { viewTransition, startViewTransition, transitionName, supportsViewTransitions } from "./view-transition.js";
export type { ViewTransitionHandle, ViewTransitionOptions } from "./view-transition.js";

// Overlays: native top layer via the popover API and <dialog>
export { popover, dialog } from "./overlay.js";
export type { OverlayOptions, DialogOptions } from "./overlay.js";

// Environment: page visibility and network reachability
export { visible, online } from "./environment.js";

// Web Animations: keyframes with cancellation tracked to the component
export { animate, animateElement, supportsAnimations } from "./animate.js";
export type { AnimateOptions, LoomAnimation } from "./animate.js";

// Long-lived connections: SSE and WebSocket with backoff and cleanup
export { sse, socket } from "./stream.js";
export type { StreamOptions } from "./stream.js";

// Device APIs: geolocation watch, wake lock, native share
export { geolocation, wakeLock, share, canShare } from "./device.js";
export type { GeolocationWatchOptions, ShareData } from "./device.js";

// Selection and CSS Custom Highlight: style text without wrapping it
export { selection, readSelection, highlight, findRanges, supportsHighlights } from "./selection.js";
export type { SelectionInfo } from "./selection.js";
