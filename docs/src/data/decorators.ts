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
  { name: "@component",      id: "component",      color: "var(--accent)",          category: "Component" },

  // State
  { name: "@reactive",       id: "reactive",       color: "var(--amber)",           category: "State" },
  { name: "@prop",           id: "prop",           color: "var(--amber)",           category: "State" },
  { name: "@computed",       id: "computed",        color: "var(--amber)",           category: "State" },
  { name: "@watch",          id: "watch",           color: "var(--amber)",           category: "State" },

  // Events
  { name: "@on",             id: "on",             color: "var(--rose)",            category: "Events" },
  { name: "@emit",           id: "emit",           color: "var(--rose)",            category: "Events" },

  // DOM
  { name: "@query",          id: "query",          color: "var(--emerald)",         category: "DOM" },
  { name: "@queryAll",       id: "queryall",       color: "var(--emerald)",         category: "DOM" },

  // Lifecycle
  { name: "@mount",          id: "mount",          color: "var(--cyan)",            category: "Lifecycle" },
  { name: "@unmount",        id: "unmount",        color: "var(--cyan)",            category: "Lifecycle" },
  { name: "@catch_",         id: "catch",          color: "var(--cyan)",            category: "Lifecycle" },
  { name: "@suspend",        id: "suspend",        color: "var(--cyan)",            category: "Lifecycle" },

  // DI & Services
  { name: "@service",        id: "service",        color: "var(--text-secondary)",  category: "DI & Services" },
  { name: "@inject",         id: "inject",         color: "var(--text-secondary)",  category: "DI & Services" },
  { name: "@factory",        id: "factory",        color: "var(--text-secondary)",  category: "DI & Services" },

  // Timing
  { name: "@interval",       id: "interval",       color: "var(--amber)",           category: "Timing" },
  { name: "@timeout",        id: "timeout",        color: "var(--amber)",           category: "Timing" },
  { name: "@debounce",       id: "debounce",       color: "var(--amber)",           category: "Timing" },
  { name: "@throttle",       id: "throttle",       color: "var(--amber)",           category: "Timing" },
  { name: "@animationFrame", id: "animationframe", color: "var(--amber)",           category: "Timing" },


  // Transform
  { name: "@transform",     id: "transform",      color: "var(--emerald)",         category: "Transform" },
];

export const DECORATOR_COUNT = DECORATOR_LIST.length;
