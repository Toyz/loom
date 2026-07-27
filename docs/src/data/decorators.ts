/**
 * Shared decorator registry — single source of truth for all Loom decorators.
 * Both the decorators page and home page reference this list.
 */

export interface DecoratorEntry {
  name: string;
  id: string;
  color: string;
  category: string;
}

export const DECORATOR_LIST: DecoratorEntry[] = [
  // Foundation
  { name: "createDecorator", id: "createdecorator", color: "var(--emerald)", category: "Foundation" },

  // Component
  { name: "@component", id: "component", color: "var(--accent)", category: "Component" },
  { name: "@attribute", id: "attribute", color: "var(--accent)", category: "Component" },
  { name: "@styles", id: "styles", color: "var(--accent)", category: "Component" },
  { name: "@dynamicCss", id: "dynamiccss", color: "var(--accent)", category: "Component" },
  { name: "@lazy", id: "lazy", color: "var(--accent)", category: "Component" },
  { name: "@transition", id: "transition", color: "var(--accent)", category: "Component" },


  // State
  { name: "@reactive", id: "reactive", color: "var(--amber)", category: "State" },
  { name: "@prop", id: "prop", color: "var(--amber)", category: "State" },
  { name: "@computed", id: "computed", color: "var(--amber)", category: "State" },
  { name: "@watch", id: "watch", color: "var(--amber)", category: "State" },
  { name: "@readonly", id: "readonly", color: "var(--amber)", category: "State" },
  { name: "@store", id: "store", color: "var(--amber)", category: "State" },
  { name: "@signal", id: "signal", color: "var(--amber)", category: "State" },
  { name: "@persist", id: "persist", color: "var(--amber)", category: "State" },

  // Events
  { name: "@on", id: "on", color: "var(--rose)", category: "Events" },
  { name: "@emit", id: "emit", color: "var(--rose)", category: "Events" },
  { name: "@event", id: "event", color: "var(--rose)", category: "Events" },

  // DOM
  { name: "@query", id: "query", color: "var(--emerald)", category: "DOM" },
  { name: "@queryAll", id: "queryall", color: "var(--emerald)", category: "DOM" },
  { name: "@slot", id: "slot", color: "var(--emerald)", category: "DOM" },
  { name: "@form", id: "form", color: "var(--emerald)", category: "DOM" },

  // Lifecycle
  { name: "@mount", id: "mount", color: "var(--cyan)", category: "Lifecycle" },
  { name: "@unmount", id: "unmount", color: "var(--cyan)", category: "Lifecycle" },
  { name: "@catch_", id: "catch", color: "var(--cyan)", category: "Lifecycle" },
  { name: "@suspend", id: "suspend", color: "var(--cyan)", category: "Lifecycle" },

  // DI & Services
  { name: "@service", id: "service", color: "var(--text-secondary)", category: "DI & Services" },
  { name: "@inject", id: "inject", color: "var(--text-secondary)", category: "DI & Services" },
{ name: "@maybe", id: "maybe", color: "var(--text-secondary)", category: "DI & Services" },
  { name: "@factory", id: "factory", color: "var(--text-secondary)", category: "DI & Services" },

  // Timing
  { name: "@interval", id: "interval", color: "var(--amber)", category: "Timing" },
  { name: "@timeout", id: "timeout", color: "var(--amber)", category: "Timing" },
  { name: "@debounce", id: "debounce", color: "var(--amber)", category: "Timing" },
  { name: "@throttle", id: "throttle", color: "var(--amber)", category: "Timing" },
  { name: "@animationFrame", id: "animationframe", color: "var(--amber)", category: "Timing" },
  { name: "@hotkey", id: "hotkey", color: "var(--amber)", category: "Timing" },
  { name: "@log", id: "log", color: "var(--amber)", category: "Timing" },
  { name: "@provide", id: "provide", color: "var(--cyan)", category: "Context" },
  { name: "@consume", id: "consume", color: "var(--cyan)", category: "Context" },
  { name: "@portal", id: "portal", color: "var(--cyan)", category: "Context" },

  // Platform
  { name: "@media", id: "media", color: "var(--rose)", category: "Platform" },
  { name: "@fullscreen", id: "fullscreen", color: "var(--rose)", category: "Platform" },
  { name: "@clipboard", id: "clipboard", color: "var(--rose)", category: "Platform" },
  { name: "@draggable", id: "draggable", color: "var(--rose)", category: "Platform" },
  { name: "@dropzone", id: "dropzone", color: "var(--rose)", category: "Platform" },
  { name: "@permission", id: "permission", color: "var(--rose)", category: "Platform" },
  { name: "@hotkey", id: "hotkey", color: "var(--rose)", category: "Platform" },
  { name: "@observer", id: "observer", color: "var(--rose)", category: "Platform" },

  // Transform
  { name: "@transform", id: "transform", color: "var(--emerald)", category: "Transform" },
  { name: "createTransform", id: "createtransform", color: "var(--emerald)", category: "Transform" },
  { name: "typed<T>", id: "typed", color: "var(--emerald)", category: "Transform" },
  { name: "typedTransformer<T>", id: "typedtransformer", color: "var(--emerald)", category: "Transform" },

  // Data
  { name: "@api", id: "api", color: "var(--amber)", category: "Data" },
  { name: "@fetch", id: "fetch", color: "var(--amber)", category: "Data" },
  { name: "@intercept", id: "intercept", color: "var(--amber)", category: "Data" },

  // Router
  { name: "@route", id: "route", color: "var(--cyan)", category: "Router" },
  { name: "@group", id: "group", color: "var(--cyan)", category: "Router" },
  { name: "@guard", id: "guard", color: "var(--cyan)", category: "Router" },
  { name: "@onRouteEnter", id: "onrouteenter", color: "var(--cyan)", category: "Router" },
  { name: "@onRouteLeave", id: "onrouteleave", color: "var(--cyan)", category: "Router" },

  // Platform APIs (0.23.0)
  { name: "@state", id: "state", color: "var(--accent)", category: "Component" },
  { name: "@aria", id: "aria", color: "var(--accent)", category: "Component" },
  { name: "@formValue", id: "formvalue", color: "var(--rose)", category: "Data" },
  { name: "@validity", id: "validity", color: "var(--rose)", category: "Data" },
  { name: "@viewTransition", id: "viewtransition", color: "var(--accent)", category: "Component" },
  { name: "@popover", id: "popover", color: "var(--accent)", category: "DOM" },
  { name: "@dialog", id: "dialog", color: "var(--accent)", category: "DOM" },
  { name: "@visible", id: "visible", color: "var(--cyan)", category: "Platform" },
  { name: "@online", id: "online", color: "var(--cyan)", category: "Platform" },
  { name: "@idle", id: "idle", color: "var(--amber)", category: "Timing" },
  { name: "@animate", id: "animate", color: "var(--accent)", category: "DOM" },
  { name: "@sse", id: "sse", color: "var(--rose)", category: "Data" },
  { name: "@socket", id: "socket", color: "var(--rose)", category: "Data" },
  { name: "@geolocation", id: "geolocation", color: "var(--cyan)", category: "Platform" },
  { name: "@wakeLock", id: "wakeLock", color: "var(--cyan)", category: "Platform" },
  { name: "@selection", id: "selection", color: "var(--cyan)", category: "DOM" },
];

/**
 * How many decorators there are.
 *
 * Not `DECORATOR_LIST.length`: the list also carries Foundation entries like
 * `createDecorator` and the Transform helpers, which are functions you call,
 * not decorators you apply. Counting them made the home page claim one more
 * decorator than Loom has.
 */
export const DECORATOR_COUNT = DECORATOR_LIST.filter((d) => d.name.startsWith("@")).length;
