/**
 * Lazy-loaded pages — side-effect import registers routes via @lazy.
 *
 * Add new lazy pages here instead of eagerly importing them in main.tsx.
 * Each stub registers a route + custom element, but defers the real
 * module load until first navigation via @lazy.
 *
 * @searchable registers pages into the global search index for ⌘K.
 */
import { LoomElement, component } from "@toyz/loom";
import { lazy } from "@toyz/loom/element";
import { route } from "@toyz/loom/router";
import { searchable } from "../search-registry";
import {
  ElementGroup,
  StoreGroup,
  RouterGroup,
  DecoratorsGroup,
  DIGroup,
  PackagesGroup,
  ExamplesGroup,
} from "../groups";

// ── Guides ──

@route("/guides/getting-started")
@component("page-getting-started")
@lazy(() => import("./getting-started"))
@searchable({ title: "Getting Started", section: "Guides", icon: "book", to: "/guides/getting-started", keywords: ["start", "install", "setup", "quickstart", "introduction", "npm"], summary: "From zero to your first Loom component in under 2 minutes." })
class LazyGettingStarted extends LoomElement { }

@route("/guides/your-first-app")
@component("page-first-app")
@lazy(() => import("./first-app"))
@searchable({ title: "Your First App", section: "Guides", icon: "sparkles", to: "/guides/your-first-app", keywords: ["tutorial", "first", "app", "hello world", "beginner"], summary: "Build a persistent todo list in 4 files with Vite + Loom." })
class LazyFirstApp extends LoomElement { }

@route("/guides/debugging")
@component("page-debugging")
@lazy(() => import("./guides/debugging"))
@searchable({ title: "Debugging", section: "Guides", icon: "search", to: "/guides/debugging", keywords: ["debug", "inspect", "devtools", "symbols", "metadata", "console"], summary: "Zero-install component inspection with inspect() and createSymbol()." })
class LazyDebugging extends LoomElement { }

@route("/guides/hydration")
@component("page-hydration")
@lazy(() => import("./guides/hydration"))
@searchable({ title: "Hydration", section: "Guides", icon: "zap", to: "/guides/hydration", keywords: ["hydration", "DSD", "declarative shadow DOM", "FCP", "performance", "pre-render", "sync render"], summary: "Instant FCP with Declarative Shadow DOM — zero extra dependencies." })
class LazyHydration extends LoomElement { }

// ── Standalone ──

@route("/result")
@component("page-result")
@lazy(() => import("./result"))
@searchable({ title: "LoomResult", section: "Core", icon: "sparkles", to: "/result", keywords: ["result", "error", "ok", "match", "pattern matching", "monadic"], summary: "Rust-inspired Result type for explicit, composable error handling." })
class LazyResult extends LoomElement { }

@route("/text")
@component("page-text")
@lazy(() => import("./text"))
@searchable({ title: "text()", section: "Core", icon: "type", to: "/text", keywords: ["text", "unescape", "decode", "html entities", "entity", "&lt;", "&amp;", "server", "escape"], summary: "Zero-allocation HTML entity decoder for safe JSX rendering." })
class LazyText extends LoomElement { }

// ── Element ──

@route("/overview", { group: ElementGroup })
@component("page-element-overview")
@lazy(() => import("./element/overview"))
@searchable({ title: "Overview", section: "Element", icon: "cube", to: "/element/overview", keywords: ["element", "component", "web component", "custom element", "LoomElement"], summary: "The base class for every Loom web component." })
class LazyElementOverview extends LoomElement { }

@route("/lifecycle", { group: ElementGroup })
@component("page-element-lifecycle")
@lazy(() => import("./element/lifecycle"))
@searchable({ title: "Lifecycle", section: "Element", icon: "refresh", to: "/element/lifecycle", keywords: ["lifecycle", "mount", "unmount", "connected", "disconnected", "connectedCallback", "shouldUpdate", "firstUpdated"], summary: "Hooks for setup, teardown, error handling, and async loading." })
class LazyElementLifecycle extends LoomElement { }

@route("/timing", { group: ElementGroup })
@component("page-element-timing")
@lazy(() => import("./element/timing"))
@searchable({ title: "Timing", section: "Element", icon: "zap", to: "/element/timing", keywords: ["interval", "timeout", "debounce", "throttle", "animation frame", "timing"], summary: "Auto-cleaned timer and animation frame decorators." })
class LazyElementTiming extends LoomElement { }


@route("/css", { group: ElementGroup })
@component("page-element-css")
@lazy(() => import("./element/css"))
@searchable({ title: "CSS", section: "Element", icon: "palette", to: "/element/css", keywords: ["css", "styles", "shadow dom", "scoped", "adoptedStyleSheets", "css template"], summary: "Scoped styles via tagged template literals and CSSStyleSheet." })
class LazyElementCss extends LoomElement { }

@route("/queries", { group: ElementGroup })
@component("page-element-queries")
@lazy(() => import("./element/queries"))
@searchable({ title: "DOM Queries", section: "Element", icon: "search", to: "/element/queries", keywords: ["query", "querySelector", "queryAll", "dom", "select", "ref"], summary: "Lazy shadow DOM selectors via decorators." })
class LazyElementQueries extends LoomElement { }

@route("/jsx", { group: ElementGroup })
@component("page-jsx")
@lazy(() => import("./element/jsx"))
@searchable({ title: "JSX & Morphing", section: "Element", icon: "code", to: "/element/jsx", keywords: ["jsx", "render", "template", "vdom", "morphing", "diffing", "update"], summary: "Zero virtual DOM — JSX compiles directly to DOM nodes and morphs in-place." })
class LazyElementJsx extends LoomElement { }

@route("/virtual-list", { group: ElementGroup })
@component("page-virtual-list")
@lazy(() => import("./element/virtual-list"))
@searchable({ title: "Virtual List", section: "Element", icon: "list", to: "/element/virtual-list", keywords: ["virtual", "list", "scroll", "virtualization", "performance", "large list"], summary: "Render thousands of items efficiently with windowed virtualization." })
class LazyElementVirtualList extends LoomElement { }

@route("/icon", { group: ElementGroup })
@component("page-element-icon")
@lazy(() => import("./element/icon"))
@searchable({ title: "Icon", section: "Element", icon: "star", to: "/element/icon", keywords: ["icon", "svg", "loom-icon", "feather"], summary: "SVG icon system with lazy registration." })
class LazyElementIcon extends LoomElement { }

@route("/canvas", { group: ElementGroup })
@component("page-element-canvas")
@lazy(() => import("./element/canvas"))
@searchable({ title: "Canvas", section: "Element", icon: "canvas", to: "/element/canvas", keywords: ["canvas", "2d", "drawing", "game", "animation", "loom-canvas"], summary: "Managed canvas element with automatic sizing and 2D context." })
class LazyElementCanvas extends LoomElement { }

@route("/image", { group: ElementGroup })
@component("page-element-image")
@lazy(() => import("./element/image"))
@searchable({ title: "Image", section: "Element", icon: "image", to: "/element/image", keywords: ["image", "lazy load", "loom-image", "picture", "responsive"], summary: "Lazy-loaded images with placeholder and responsive sizing." })
class LazyElementImage extends LoomElement { }

@route("/decorators", { group: ElementGroup })
@component("page-element-decorators")
@lazy(() => import("./element/decorators"))
@searchable({ title: "Decorators", section: "Element", icon: "hash", to: "/element/decorators", keywords: ["decorator", "prop", "reactive", "query", "watch", "observe", "readonly"], summary: "Element-specific decorators for registration, state, lifecycle, and DOM queries." })
class LazyElementDecorators extends LoomElement { }

@route("/lazy", { group: ElementGroup })
@component("page-element-lazy")
@lazy(() => import("./element/lazy"), {
  loading: () => <div>Loading...</div>
})
@searchable({ title: "Lazy Loading", section: "Element", icon: "download", to: "/element/lazy", keywords: ["lazy", "code splitting", "dynamic import", "deferred", "on-demand"], summary: "Defer component module loading until first mount." })
class LazyElementLazy extends LoomElement { }

@route("/observer", { group: ElementGroup })
@component("page-element-observer")
@lazy(() => import("./element/observer"))
@searchable({ title: "Observer", section: "Element", icon: "eye", to: "/element/observer", keywords: ["observer", "resize", "intersection", "mutation", "observe", "viewport", "visibility"], summary: "Auto-managed ResizeObserver, IntersectionObserver, and MutationObserver with lifecycle cleanup." })
class LazyElementObserver extends LoomElement { }

@route("/forms", { group: ElementGroup })
@component("page-element-forms")
@lazy(() => import("./element/forms"))
@searchable({ title: "Forms", section: "Element", icon: "clipboard", to: "/element/forms", keywords: ["form", "validation", "input", "submit", "field", "binding"], summary: "Typed form state with transforms, validation, and @form binding." })
class LazyElementForms extends LoomElement { }

@route("/light-dom", { group: ElementGroup })
@component("page-element-light-dom")
@lazy(() => import("./element/light-dom"))
@searchable({ title: "Light DOM", section: "Element", icon: "sun", to: "/element/light-dom", keywords: ["light dom", "shadow", "no shadow", "inherit", "styles", "leaf"], summary: "Skip shadow DOM for leaf components that inherit parent styles." })
class LazyElementLightDom extends LoomElement { }

// ── Store ──

@route("/overview", { group: StoreGroup })
@component("page-store-overview")
@lazy(() => import("./store/overview"))
@searchable({ title: "Overview", section: "Store", icon: "archive", to: "/store/overview", keywords: ["store", "state", "reactive", "signal", "observable"], summary: "Reactive primitives, component stores, and persistent storage." })
class LazyStoreOverview extends LoomElement { }

@route("/reactive", { group: StoreGroup })
@component("page-store-reactive")
@lazy(() => import("./store/reactive"))
@searchable({ title: "Reactive", section: "Store", icon: "bolt", to: "/store/reactive", keywords: ["reactive", "signal", "Reactive", "CollectionStore", "observable", "state"], summary: "Observable values with automatic component re-rendering." })
class LazyStoreReactive extends LoomElement { }

@route("/store-decorator", { group: StoreGroup })
@component("page-store-decorator")
@lazy(() => import("./store/store-decorator"))
@searchable({ title: "Decorator", section: "Store", icon: "package", to: "/store/store-decorator", keywords: ["@store", "decorator", "inject", "singleton"], summary: "Component-scoped reactive stores with optional persistence." })
class LazyStoreDecorator extends LoomElement { }

@route("/storage", { group: StoreGroup })
@component("page-store-storage")
@lazy(() => import("./store/storage"))
@searchable({ title: "Storage", section: "Store", icon: "database", to: "/store/storage", keywords: ["localStorage", "sessionStorage", "persist", "storage", "save"], summary: "Pluggable storage adapters for localStorage, sessionStorage, and custom backends." })
class LazyStoreStorage extends LoomElement { }

@route("/patterns", { group: StoreGroup })
@component("page-store-patterns")
@lazy(() => import("./store/patterns"))
@searchable({ title: "Patterns", section: "Store", icon: "layers", to: "/store/patterns", keywords: ["patterns", "best practices", "architecture", "derived", "computed"], summary: "Common patterns for wiring stores into components and services." })
class LazyStorePatterns extends LoomElement { }

@route("/signals", { group: StoreGroup })
@component("page-store-signals")
@lazy(() => import("./store/signals"))
@searchable({ title: "Signals", section: "Store", icon: "radio", to: "/store/signals", keywords: ["signal", "tc39", "Signal.State", "Signal.Computed", "@signal", "interop", "future"], summary: "TC39 Signals interop with real-DOM trace engine." })
class LazyStoreSignals extends LoomElement { }

@route("/api", { group: StoreGroup })
@component("page-store-api")
@lazy(() => import("./store/api"))
@searchable({ title: "Fetch", section: "Store", icon: "zap", to: "/store/api", keywords: ["fetch", "api", "http", "request", "data fetching"], summary: "Declarative async data fetching with interceptor pipelines." })
class LazyStoreApi extends LoomElement { }

// ── DI & Services ──

@route("/overview", { group: DIGroup })
@component("page-di-overview")
@lazy(() => import("./di/overview"))
@searchable({ title: "Overview", section: "DI & Services", icon: "box", to: "/di/overview", keywords: ["dependency injection", "di", "service", "container", "inject", "provider", "lifecycle", "start", "stop", "LoomLifecycle", "app.start", "app.stop", "auto-start"], summary: "Service container, singleton management, provider patterns, and lifecycle hooks." })
class LazyDIOverview extends LoomElement { }

@route("/decorators", { group: DIGroup })
@component("page-di-decorators")
@lazy(() => import("./di/decorators"))
@searchable({ title: "Decorators", section: "DI & Services", icon: "hash", to: "/di/decorators", keywords: ["@service", "@factory", "@inject", "@maybe", "use", "provider", "singleton", "optional"], summary: "DI-specific decorators for services, injection, optional injection, and provider factories." })
class LazyDIDecorators extends LoomElement { }

@searchable({ title: "LoomLifecycle", section: "DI & Services", icon: "activity", to: "/di/overview", keywords: ["LoomLifecycle", "lifecycle", "start", "stop", "auto-start", "auto-stop", "service lifecycle", "router.start", "app.start", "app.stop"], summary: "Auto-call start()/stop() on DI services — no manual wiring needed." })
class _LoomLifecycleSearchEntry { }

// ── Router ──

@route("/overview", { group: RouterGroup })
@component("page-router-overview")
@lazy(() => import("./router/overview"))
@searchable({ title: "Overview", section: "Router", icon: "compass", to: "/router/overview", keywords: ["router", "routing", "spa", "navigation", "hash", "history"], summary: "Dual-mode router with hash and history support, zero config." })
class LazyRouterOverview extends LoomElement { }

@route("/routes", { group: RouterGroup })
@component("page-router-routes")
@lazy(() => import("./router/routes"))
@searchable({ title: "Routes", section: "Router", icon: "map", to: "/router/routes", keywords: ["route", "path", "url", "pattern", "params", "dynamic"], summary: "Define routes with @route, path params, and lazy loading." })
class LazyRouterRoutes extends LoomElement { }

@route("/route-data", { group: RouterGroup })
@component("page-router-route-data")
@lazy(() => import("./router/route-data"))
@searchable({ title: "Route Data", section: "Router", icon: "database", to: "/router/route-data", keywords: ["param", "params", "query", "url", "inject", "prop", "route data", "query string"], summary: "Inject route params and query strings into components with @prop." })
class LazyRouterRouteData extends LoomElement { }

@route("/guards", { group: RouterGroup })
@component("page-router-guards")
@lazy(() => import("./router/guards"))
@searchable({ title: "Guards", section: "Router", icon: "shield", to: "/router/guards", keywords: ["guard", "auth", "protect", "middleware", "before", "canActivate"], summary: "Route protection with Result-based guards and DI injection." })
class LazyRouterGuards extends LoomElement { }

@route("/groups", { group: RouterGroup })
@component("page-router-groups")
@lazy(() => import("./router/groups"))
@searchable({ title: "Groups", section: "Router", icon: "layers", to: "/router/groups", keywords: ["group", "prefix", "nested", "layout", "shared"], summary: "Prefix-based route grouping with shared parent outlets." })
class LazyRouterGroups extends LoomElement { }

@route("/navigation", { group: RouterGroup })
@component("page-router-navigation")
@lazy(() => import("./router/navigation"))
@searchable({ title: "Navigation", section: "Router", icon: "arrow-right", to: "/router/navigation", keywords: ["navigate", "link", "loom-link", "programmatic", "redirect"], summary: "Programmatic navigation and the loom-link component." })
class LazyRouterNavigation extends LoomElement { }

@route("/route-lifecycle", { group: RouterGroup })
@component("page-route-lifecycle")
@lazy(() => import("./router/route-lifecycle"))
@searchable({ title: "Lifecycle", section: "Router", icon: "refresh", to: "/router/route-lifecycle", keywords: ["route lifecycle", "enter", "leave", "activate", "deactivate"], summary: "Run code when entering or leaving a route." })
class LazyRouterRouteLifecycle extends LoomElement { }

@route("/decorators", { group: RouterGroup })
@component("page-router-decorators")
@lazy(() => import("./router/decorators"))
@searchable({ title: "Decorators", section: "Router", icon: "hash", to: "/router/decorators", keywords: ["@route", "@group", "@guard", "decorator", "routing decorators"], summary: "Router-specific decorators for route registration, guards, and groups." })
class LazyRouterDecorators extends LoomElement { }

// ── Decorators ──

@route("/overview", { group: DecoratorsGroup })
@component("page-decorators-overview")
@lazy(() => import("./decorators/overview"))
@searchable({ title: "Overview", section: "Decorators", icon: "hash", to: "/decorators/overview", keywords: ["decorators", "TC39", "stage 3", "overview", "createDecorator", "readonly", "immutable", "freeze"], summary: "Full catalog of Loom's 30+ TC39 decorators." })
class LazyDecoratorsOverview extends LoomElement { }

@route("/events", { group: DecoratorsGroup })
@component("page-decorator-events")
@lazy(() => import("./decorators/events"))
@searchable({ title: "Events", section: "Decorators", icon: "broadcast", to: "/decorators/events", keywords: ["events", "@on", "@emit", "custom event", "listener", "dispatch"], summary: "Typed, class-based events and declarative event decorators." })
class LazyDecoratorsEvents extends LoomElement { }

@route("/transform", { group: DecoratorsGroup })
@component("page-decorator-transform")
@lazy(() => import("./decorators/transform"))
@searchable({ title: "Transform", section: "Decorators", icon: "refresh", to: "/decorators/transform", keywords: ["transform", "@transform", "pipe", "accessor", "computed"], summary: "Value transformation decorators for parsing and conversion." })
class LazyDecoratorTransform extends LoomElement { }

@route("/hotkey", { group: DecoratorsGroup })
@component("page-decorator-hotkey")
@lazy(() => import("./decorators/hotkey"))
@searchable({ title: "Hotkey", section: "Decorators", icon: "command", to: "/decorators/hotkey", keywords: ["hotkey", "keyboard", "shortcut", "key binding", "ctrl", "cmd", "combo"], summary: "Declarative keyboard shortcuts with auto-cleanup." })
class LazyDecoratorHotkey extends LoomElement { }

@route("/log", { group: DecoratorsGroup })
@component("page-decorator-log")
@lazy(() => import("./decorators/log"))
@searchable({ title: "Log", section: "Decorators", icon: "zap", to: "/decorators/log", keywords: ["log", "logging", "transport", "console", "sentry", "debug", "structured"], summary: "Structured method logging with pluggable transports." })
class LazyDecoratorLog extends LoomElement { }

@route("/context", { group: DecoratorsGroup })
@component("page-decorator-context")
@lazy(() => import("./decorators/context"))
@searchable({ title: "Context", section: "Decorators", icon: "thread", to: "/decorators/context", keywords: ["context", "provide", "consume", "shadow dom", "cross-boundary", "W3C", "data sharing"], summary: "Cross-shadow-DOM data sharing with class-based keys." })
class LazyDecoratorContext extends LoomElement { }

@route("/portal", { group: DecoratorsGroup })
@component("page-decorator-portal")
@lazy(() => import("./decorators/portal"))
@searchable({ title: "Portal", section: "Decorators", icon: "external-link", to: "/decorators/portal", keywords: ["portal", "teleport", "modal", "tooltip", "dropdown", "stacking context", "body"], summary: "Teleport content to external DOM targets." })
class LazyDecoratorPortal extends LoomElement { }

@route("/symbols", { group: DecoratorsGroup })
@component("page-decorator-symbols")
@lazy(() => import("./decorators/symbols"))
@searchable({ title: "Typed Symbols", section: "Decorators", icon: "key", to: "/decorators/symbols", keywords: ["LoomSymbol", "createSymbol", "symbol", "metadata", "typed", "registry", "SYMBOL_REGISTRY"], summary: "Type-safe symbol metadata with LoomSymbol<T>." })
class LazyDecoratorSymbols extends LoomElement { }

@route("/media", { group: DecoratorsGroup })
@component("page-decorator-media")
@lazy(() => import("./decorators/media"))
@searchable({ title: "Media", section: "Decorators", icon: "monitor", to: "/decorators/media", keywords: ["media", "matchMedia", "responsive", "breakpoint", "mobile", "dark mode", "prefers-color-scheme"], summary: "Reactive media query binding for accessor fields." })
class LazyDecoratorMedia extends LoomElement { }

@route("/fullscreen", { group: DecoratorsGroup })
@component("page-decorator-fullscreen")
@lazy(() => import("./decorators/fullscreen"))
@searchable({ title: "Fullscreen", section: "Decorators", icon: "maximize", to: "/decorators/fullscreen", keywords: ["fullscreen", "maximize", "toggle", "escape", "video", "immersive"], summary: "Boolean accessor bound to the Fullscreen API." })
class LazyDecoratorFullscreen extends LoomElement { }

@route("/clipboard", { group: DecoratorsGroup })
@component("page-decorator-clipboard")
@lazy(() => import("./decorators/clipboard"))
@searchable({ title: "Clipboard", section: "Decorators", icon: "clipboard", to: "/decorators/clipboard", keywords: ["clipboard", "copy", "paste", "write", "read", "share"], summary: "Declarative clipboard read/write." })
class LazyDecoratorClipboard extends LoomElement { }

@route("/dnd", { group: DecoratorsGroup })
@component("page-decorator-dnd")
@lazy(() => import("./decorators/dnd"))
@searchable({ title: "Drag & Drop", section: "Decorators", icon: "move", to: "/decorators/dnd", keywords: ["drag", "drop", "draggable", "dropzone", "dnd", "kanban", "reorder", "sortable"], summary: "Declarative HTML5 Drag and Drop." })
class LazyDecoratorDnd extends LoomElement { }

@route("/css", { group: DecoratorsGroup })
@component("page-decorator-css")
@lazy(() => import("./decorators/css"))
@searchable({ title: "Dynamic CSS", section: "Decorators", icon: "palette", to: "/decorators/css", keywords: ["css", "dynamic", "styles", "theme", "reactive", "stylesheet", "scoped"], summary: "Reactive scoped styles from a method." })
class LazyDecoratorCSS extends LoomElement { }

// ── Examples ──

@route("/clock", { group: ExamplesGroup })
@component("page-example-clock")
@lazy(() => import("./examples/clock"))
@searchable({ title: "Clock", section: "Examples", icon: "zap", to: "/examples/clock", keywords: ["clock", "time", "interval", "example", "demo"], summary: "Live clock using @interval for automatic re-rendering." })
class LazyExampleClock extends LoomElement { }

@route("/todo", { group: ExamplesGroup })
@component("page-example-todo")
@lazy(() => import("./examples/todo"))
@searchable({ title: "Todo List", section: "Examples", icon: "check", to: "/examples/todo", keywords: ["todo", "list", "crud", "example", "demo"], summary: "Persistent todo list with CollectionStore and localStorage." })
class LazyExampleTodo extends LoomElement { }

@route("/kanban", { group: ExamplesGroup })
@component("page-example-kanban")
@lazy(() => import("./examples/kanban"))
@searchable({ title: "Kanban Board", section: "Examples", icon: "columns", to: "/examples/kanban", keywords: ["kanban", "drag", "drop", "board", "task", "column", "dnd"], summary: "Drag & drop task management with @draggable/@dropzone selectors." })
class LazyExampleKanban extends LoomElement { }

@route("/theme-switcher", { group: ExamplesGroup })
@component("page-example-theme")
@lazy(() => import("./examples/theme-switcher"))
@searchable({ title: "Theme Switcher", section: "Examples", icon: "eye", to: "/examples/theme-switcher", keywords: ["theme", "dark", "light", "toggle", "example"], summary: "Dark/light mode toggle with reactive CSS variables." })
class LazyExampleTheme extends LoomElement { }

@route("/form", { group: ExamplesGroup })
@component("page-example-form")
@lazy(() => import("./examples/form"))
@searchable({ title: "Contact Form", section: "Examples", icon: "edit", to: "/examples/form", keywords: ["form", "contact", "validation", "example", "demo"], summary: "Live contact form with @form validation and field binding." })
class LazyExampleForm extends LoomElement { }

@route("/api", { group: ExamplesGroup })
@component("page-example-api")
@lazy(() => import("./examples/api"))
@searchable({ title: "Fetch", section: "Examples", icon: "download", to: "/examples/api", keywords: ["fetch", "api", "http", "example", "demo"], summary: "Data fetching with @api, loading states, and error handling." })
class LazyExampleApi extends LoomElement { }

@route("/stress-test", { group: ExamplesGroup })
@component("page-example-stress")
@lazy(() => import("./examples/stress-test"))
@searchable({ title: "Stress Test", section: "Examples", icon: "zap", to: "/examples/stress-test", keywords: ["stress", "performance", "benchmark", "example", "demo"], summary: "Rendering benchmark — bulk-update thousands of reactive nodes." })
class LazyExampleStress extends LoomElement { }

@route("/virtual-list-demo", { group: ExamplesGroup })
@component("page-example-virtual-list")
@lazy(() => import("./examples/virtual-list"))
@searchable({ title: "Virtual List", section: "Examples", icon: "list", to: "/examples/virtual-list-demo", keywords: ["virtual", "list", "scroll", "example", "demo"], summary: "100K items scrolling smoothly with loom-virtual." })
class LazyExampleVirtualList extends LoomElement { }

@route("/timing-demo", { group: ExamplesGroup })
@component("page-example-timing")
@lazy(() => import("./examples/timing"))
@searchable({ title: "Timing", section: "Examples", icon: "clock", to: "/examples/timing-demo", keywords: ["timing", "interval", "debounce", "throttle", "example"], summary: "Live demos of @interval, @debounce, @throttle, and @animationFrame." })
class LazyExampleTiming extends LoomElement { }

@route("/canvas-game", { group: ExamplesGroup })
@component("page-example-canvas-game")
@lazy(() => import("./examples/canvas-game"))
@searchable({ title: "Canvas Game", section: "Examples", icon: "canvas", to: "/examples/canvas-game", keywords: ["canvas", "game", "2d", "animation", "example"], summary: "Playable 2D game built with loom-canvas and @animationFrame." })
class LazyExampleCanvasGame extends LoomElement { }

@route("/image-gallery", { group: ExamplesGroup })
@component("page-example-image-gallery")
@lazy(() => import("./examples/image-gallery"))
@searchable({ title: "Image Gallery", section: "Examples", icon: "image", to: "/examples/image-gallery", keywords: ["image", "gallery", "photo", "example", "demo"], summary: "Responsive image grid with lazy-loaded loom-image components." })
class LazyExampleImageGallery extends LoomElement { }

@route("/eventbus", { group: ExamplesGroup })
@component("page-example-eventbus")
@lazy(() => import("./examples/eventbus"))
@searchable({ title: "EventBus", section: "Examples", icon: "broadcast", to: "/examples/eventbus", keywords: ["event", "bus", "once", "waitfor", "cancel", "inheritance", "emit", "example"], summary: "Interactive EventBus playground — once(), waitFor(), cancel(), and inheritance." })
class LazyExampleEventBus extends LoomElement { }

// ── Packages ──

@route("/rpc-overview", { group: PackagesGroup })
@component("page-packages-rpc-overview")
@lazy(() => import("./packages/rpc-overview"))
@searchable({ title: "RPC Overview", section: "Packages", icon: "package", to: "/packages/rpc-overview", keywords: ["rpc", "loom-rpc", "contract", "transport", "overview"], summary: "Type-safe, decorator-driven RPC — server-agnostic, transport-swappable." })
class LazyPackagesRpcOverview extends LoomElement { }

@route("/rpc-queries", { group: PackagesGroup })
@component("page-packages-rpc-queries")
@lazy(() => import("./packages/rpc-queries"))
@searchable({ title: "RPC Queries", section: "Packages", icon: "download", to: "/packages/rpc-queries", keywords: ["rpc", "@rpc", "query", "fetch", "ApiState", "SWR", "cache"], summary: "Auto-fetching, reactive queries with SWR caching and pattern matching." })
class LazyPackagesRpcQueries extends LoomElement { }

@route("/rpc-mutations", { group: PackagesGroup })
@component("page-packages-rpc-mutations")
@lazy(() => import("./packages/rpc-mutations"))
@searchable({ title: "RPC Mutations", section: "Packages", icon: "edit", to: "/packages/rpc-mutations", keywords: ["rpc", "@mutate", "mutation", "write", "RpcMutator", "call"], summary: "Manual, type-safe server writes with loading and error tracking." })
class LazyPackagesRpcMutations extends LoomElement { }

@route("/rpc-transports", { group: PackagesGroup })
@component("page-packages-rpc-transports")
@lazy(() => import("./packages/rpc-transports"))
@searchable({ title: "RPC Transports", section: "Packages", icon: "layers", to: "/packages/rpc-transports", keywords: ["rpc", "transport", "http", "websocket", "wire protocol"], summary: "Pluggable transport layer — swap HTTP, WebSocket, or mock with one DI line." })
class LazyPackagesRpcTransports extends LoomElement { }

@route("/rpc-testing", { group: PackagesGroup })
@component("page-packages-rpc-testing")
@lazy(() => import("./packages/rpc-testing"))
@searchable({ title: "RPC Testing", section: "Packages", icon: "check", to: "/packages/rpc-testing", keywords: ["rpc", "test", "mock", "MockTransport", "assert"], summary: "MockTransport — drop-in test transport with mocks, delays, and assertions." })
class LazyPackagesRpcTesting extends LoomElement { }

@route("/rpc-streams", { group: PackagesGroup })
@component("page-packages-rpc-streams")
@lazy(() => import("./packages/rpc-streams"))
@searchable({ title: "RPC Streams", section: "Packages", icon: "radio", to: "/packages/rpc-streams", keywords: ["rpc", "stream", "@stream", "@onStream", "RpcStream", "AsyncIterable", "push", "SSE", "websocket"], summary: "Server-push streams via WebSocket or SSE — decorator-driven and lifecycle-aware." })
class LazyPackagesRpcStreams extends LoomElement { }

@route("/rpc-demo", { group: PackagesGroup })
@component("page-packages-rpc-demo")
@lazy(() => import("./examples/rpc"))
@searchable({ title: "RPC Demo", section: "Packages", icon: "zap", to: "/packages/rpc-demo", keywords: ["rpc", "demo", "live", "example", "interactive"], summary: "Interactive live demo of @rpc queries and @mutate mutations." })
class LazyPackagesRpcDemo extends LoomElement { }


@route("/create-loom", { group: PackagesGroup })
@component("page-packages-create-loom")
@lazy(() => import("./packages/create-loom-overview"))
@searchable({ title: "Create Loom", section: "Packages", icon: "package", to: "/packages/create-loom", keywords: ["create", "scaffold", "init", "npx", "starter", "template", "vite"], summary: "Scaffold a new Loom + TypeScript + Vite project in seconds." })
class LazyPackagesCreateLoom extends LoomElement { }

// ── Analytics ──

@route("/analytics-overview", { group: PackagesGroup })
@component("page-packages-analytics-overview")
@lazy(() => import("./packages/analytics-overview"))
@searchable({ title: "Analytics Overview", section: "Packages", icon: "package", to: "/packages/analytics-overview", keywords: ["analytics", "loom-analytics", "track", "transport", "overview"], summary: "Zero-dependency, transport-swappable analytics for Loom." })
class LazyPackagesAnalyticsOverview extends LoomElement { }

@route("/analytics-testing", { group: PackagesGroup })
@component("page-packages-analytics-testing")
@lazy(() => import("./packages/analytics-testing"))
@searchable({ title: "Analytics Testing", section: "Packages", icon: "check", to: "/packages/analytics-testing", keywords: ["analytics", "test", "mock", "MockAnalytics", "assert"], summary: "MockAnalytics — drop-in test transport with assertions." })
class LazyPackagesAnalyticsTesting extends LoomElement { }

@route("/analytics-demo", { group: PackagesGroup })
@component("page-packages-analytics-demo")
@lazy(() => import("./examples/analytics"))
@searchable({ title: "Analytics Demo", section: "Packages", icon: "zap", to: "/packages/analytics-demo", keywords: ["analytics", "demo", "live", "example", "interactive"], summary: "Interactive live demo of @track decorator with MockAnalytics." })
class LazyPackagesAnalyticsDemo extends LoomElement { }

// ── Flags ──

@route("/flags-overview", { group: PackagesGroup })
@component("page-packages-flags-overview")
@lazy(() => import("./packages/flags-overview"))
@searchable({ title: "Flags Overview", section: "Packages", icon: "package", to: "/packages/flags-overview", keywords: ["flags", "feature-flags", "loom-flags", "flag", "toggle", "overview"], summary: "Feature flags for Loom — decorator-driven with real-time reactive updates." })
class LazyPackagesFlagsOverview extends LoomElement { }

@route("/flags-testing", { group: PackagesGroup })
@component("page-packages-flags-testing")
@lazy(() => import("./packages/flags-testing"))
@searchable({ title: "Flags Testing", section: "Packages", icon: "check", to: "/packages/flags-testing", keywords: ["flags", "test", "mock", "MockFlags", "assert"], summary: "MockFlags — drop-in test provider with assertions." })
class LazyPackagesFlagsTesting extends LoomElement { }

@route("/flags-demo", { group: PackagesGroup })
@component("page-packages-flags-demo")
@lazy(() => import("./examples/flags"))
@searchable({ title: "Flags Demo", section: "Packages", icon: "zap", to: "/packages/flags-demo", keywords: ["flags", "demo", "live", "example", "interactive"], summary: "Interactive live demo of @flag decorator and <loom-flag> component." })
class LazyPackagesFlagsDemo extends LoomElement { }

// ── Placeholder ──

@route("/placeholder-overview", { group: PackagesGroup })
@component("page-packages-placeholder-overview")
@lazy(() => import("./packages/placeholder-overview"))
@searchable({ title: "Placeholder Overview", section: "Packages", icon: "package", to: "/packages/placeholder-overview", keywords: ["placeholder", "loom-placeholder", "rgba", "image", "overview"], summary: "Placeholder components for Loom — pluggable providers, ships with rgba.lol." })
class LazyPackagesPlaceholderOverview extends LoomElement { }

@route("/placeholder-testing", { group: PackagesGroup })
@component("page-packages-placeholder-testing")
@lazy(() => import("./packages/placeholder-testing"))
@searchable({ title: "Placeholder Testing", section: "Packages", icon: "check", to: "/packages/placeholder-testing", keywords: ["placeholder", "test", "mock", "MockPlaceholder", "assert"], summary: "MockPlaceholder — drop-in test provider with assertions." })
class LazyPackagesPlaceholderTesting extends LoomElement { }

@route("/placeholder-demo", { group: PackagesGroup })
@component("page-packages-placeholder-demo")
@lazy(() => import("./examples/placeholder"))
@searchable({ title: "Placeholder Demo", section: "Packages", icon: "zap", to: "/packages/placeholder-demo", keywords: ["placeholder", "demo", "live", "rgba", "interactive"], summary: "Interactive live demo of <loom-placeholder> with RgbaPlaceholder." })
class LazyPackagesPlaceholderDemo extends LoomElement { }
