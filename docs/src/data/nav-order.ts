/**
 * Flat ordered list of all nav pages.
 * Used by doc-nav for prev/next navigation and doc-header for icon resolution.
 */
export interface NavEntry {
  label: string;
  to: string;
  section: string;
  icon: string;
}

export const navOrder: NavEntry[] = [
  // Guides
  { label: "Getting Started", to: "/guides/getting-started", section: "Guides", icon: "book" },
  { label: "Your First App", to: "/guides/your-first-app", section: "Guides", icon: "sparkles" },
  { label: "Debugging", to: "/guides/debugging", section: "Guides", icon: "search" },
  { label: "LoomResult", to: "/result", section: "Guides", icon: "sparkles" },

  // Element
  { label: "Overview", to: "/element/overview", section: "Element", icon: "cube" },
  { label: "Lifecycle", to: "/element/lifecycle", section: "Element", icon: "refresh" },
  { label: "Timing", to: "/element/timing", section: "Element", icon: "zap" },
  { label: "CSS", to: "/element/css", section: "Element", icon: "palette" },
  { label: "DOM Queries", to: "/element/queries", section: "Element", icon: "search" },
  { label: "JSX & Morphing", to: "/element/jsx", section: "Element", icon: "code" },
  { label: "Decorators", to: "/element/decorators", section: "Element", icon: "hash" },
  { label: "Light DOM", to: "/element/light-dom", section: "Element", icon: "sun" },
  { label: "Lazy Loading", to: "/element/lazy", section: "Element", icon: "download" },
  { label: "Forms", to: "/element/forms", section: "Element", icon: "clipboard" },
  { label: "Fetch", to: "/store/api", section: "Element", icon: "zap" },
  { label: "Virtual List", to: "/element/virtual-list", section: "Element", icon: "list" },
  { label: "Icon", to: "/element/icon", section: "Element", icon: "star" },
  { label: "Canvas", to: "/element/canvas", section: "Element", icon: "canvas" },
  { label: "Image", to: "/element/image", section: "Element", icon: "image" },

  // Decorators
  { label: "Overview", to: "/decorators/overview", section: "Decorators", icon: "hash" },
  { label: "Events", to: "/decorators/events", section: "Decorators", icon: "broadcast" },
  { label: "Transform", to: "/decorators/transform", section: "Decorators", icon: "refresh" },
  { label: "Hotkey", to: "/decorators/hotkey", section: "Decorators", icon: "command" },
  { label: "Log", to: "/decorators/log", section: "Decorators", icon: "zap" },
  { label: "Context", to: "/decorators/context", section: "Decorators", icon: "thread" },
  { label: "Portal", to: "/decorators/portal", section: "Decorators", icon: "external-link" },
  { label: "Typed Symbols", to: "/decorators/symbols", section: "Decorators", icon: "key" },

  // Store
  { label: "Overview", to: "/store/overview", section: "Store", icon: "archive" },
  { label: "Reactive", to: "/store/reactive", section: "Store", icon: "bolt" },
  { label: "Decorator", to: "/store/store-decorator", section: "Store", icon: "package" },
  { label: "Storage", to: "/store/storage", section: "Store", icon: "database" },
  { label: "Patterns", to: "/store/patterns", section: "Store", icon: "layers" },

  // Router
  { label: "Overview", to: "/router/overview", section: "Router", icon: "compass" },
  { label: "Routes", to: "/router/routes", section: "Router", icon: "map" },
  { label: "Route Data", to: "/router/route-data", section: "Router", icon: "database" },
  { label: "Groups", to: "/router/groups", section: "Router", icon: "layers" },
  { label: "Guards", to: "/router/guards", section: "Router", icon: "shield" },
  { label: "Navigation", to: "/router/navigation", section: "Router", icon: "arrow-right" },
  { label: "Lifecycle", to: "/router/route-lifecycle", section: "Router", icon: "refresh" },
  { label: "Decorators", to: "/router/decorators", section: "Router", icon: "hash" },

  // DI & Services
  { label: "Overview", to: "/di/overview", section: "DI & Services", icon: "box" },
  { label: "Decorators", to: "/di/decorators", section: "DI & Services", icon: "hash" },

  // Packages — RPC
  { label: "RPC Overview", to: "/packages/rpc-overview", section: "Packages", icon: "package" },
  { label: "RPC Queries", to: "/packages/rpc-queries", section: "Packages", icon: "download" },
  { label: "RPC Mutations", to: "/packages/rpc-mutations", section: "Packages", icon: "edit" },
  { label: "RPC Transports", to: "/packages/rpc-transports", section: "Packages", icon: "layers" },
  { label: "RPC Testing", to: "/packages/rpc-testing", section: "Packages", icon: "check" },
  { label: "RPC Demo", to: "/packages/rpc-demo", section: "Packages", icon: "zap" },

  // Packages — Analytics
  { label: "Analytics Overview", to: "/packages/analytics-overview", section: "Packages", icon: "package" },
  { label: "Analytics Testing", to: "/packages/analytics-testing", section: "Packages", icon: "check" },
  { label: "Analytics Demo", to: "/packages/analytics-demo", section: "Packages", icon: "zap" },

  // Packages — Flags
  { label: "Flags Overview", to: "/packages/flags-overview", section: "Packages", icon: "package" },
  { label: "Flags Testing", to: "/packages/flags-testing", section: "Packages", icon: "check" },
  { label: "Flags Demo", to: "/packages/flags-demo", section: "Packages", icon: "zap" },

  // Packages — Placeholder
  { label: "Placeholder Overview", to: "/packages/placeholder-overview", section: "Packages", icon: "package" },
  { label: "Placeholder Testing", to: "/packages/placeholder-testing", section: "Packages", icon: "check" },
  { label: "Placeholder Demo", to: "/packages/placeholder-demo", section: "Packages", icon: "zap" },

  // Packages — Create Loom
  { label: "Create Loom", to: "/packages/create-loom", section: "Packages", icon: "package" },

  // Examples
  { label: "Clock", to: "/examples/clock", section: "Examples", icon: "zap" },
  { label: "Todo List", to: "/examples/todo", section: "Examples", icon: "check" },
  { label: "Theme Switcher", to: "/examples/theme-switcher", section: "Examples", icon: "eye" },
  { label: "Contact Form", to: "/examples/form", section: "Examples", icon: "edit" },
  { label: "Fetch", to: "/examples/api", section: "Examples", icon: "download" },
  { label: "Virtual List", to: "/examples/virtual-list-demo", section: "Examples", icon: "list" },
  { label: "Timing", to: "/examples/timing-demo", section: "Examples", icon: "clock" },
  { label: "Stress Test", to: "/examples/stress-test", section: "Examples", icon: "zap" },
  { label: "Canvas Game", to: "/examples/canvas-game", section: "Examples", icon: "canvas" },
  { label: "Image Gallery", to: "/examples/image-gallery", section: "Examples", icon: "image" },
];
