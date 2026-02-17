/**
 * Lazy-loaded pages — side-effect import registers routes via @lazy.
 *
 * Add new lazy pages here instead of eagerly importing them in main.tsx.
 * Each stub registers a route + custom element, but defers the real
 * module load until first navigation via @lazy.
 */
import { LoomElement, component, lazy } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import {
  ElementGroup,
  StoreGroup,
  RouterGroup,
  DecoratorsGroup,
  DIGroup,
  ExamplesGroup,
} from "../groups";

// ── Guides ──

@route("/guides/getting-started")
@component("page-getting-started")
@lazy(() => import("./getting-started"))
class LazyGettingStarted extends LoomElement {}

@route("/guides/your-first-app")
@component("page-first-app")
@lazy(() => import("./first-app"))
class LazyFirstApp extends LoomElement {}

// ── Standalone ──

@route("/result")
@component("page-result")
@lazy(() => import("./result"))
class LazyResult extends LoomElement {}
// ── Element ──

@route("/overview", { group: ElementGroup })
@component("page-element-overview")
@lazy(() => import("./element/overview"))
class LazyElementOverview extends LoomElement {}

@route("/lifecycle", { group: ElementGroup })
@component("page-element-lifecycle")
@lazy(() => import("./element/lifecycle"))
class LazyElementLifecycle extends LoomElement {}

@route("/timing", { group: ElementGroup })
@component("page-element-timing")
@lazy(() => import("./element/timing"))
class LazyElementTiming extends LoomElement {}

@route("/css", { group: ElementGroup })
@component("page-element-css")
@lazy(() => import("./element/css"))
class LazyElementCss extends LoomElement {}

@route("/queries", { group: ElementGroup })
@component("page-element-queries")
@lazy(() => import("./element/queries"))
class LazyElementQueries extends LoomElement {}

@route("/jsx", { group: ElementGroup })
@component("page-jsx")
@lazy(() => import("./element/jsx"))
class LazyElementJsx extends LoomElement {}

@route("/virtual-list", { group: ElementGroup })
@component("page-virtual-list")
@lazy(() => import("./element/virtual-list"))
class LazyElementVirtualList extends LoomElement {}

@route("/icon", { group: ElementGroup })
@component("page-element-icon")
@lazy(() => import("./element/icon"))
class LazyElementIcon extends LoomElement {}

@route("/decorators", { group: ElementGroup })
@component("page-element-decorators")
@lazy(() => import("./element/decorators"))
class LazyElementDecorators extends LoomElement {}

@route("/lazy", { group: ElementGroup })
@component("page-element-lazy")
@lazy(() => import("./element/lazy"))
class LazyElementLazy extends LoomElement {}

@route("/forms", { group: ElementGroup })
@component("page-element-forms")
@lazy(() => import("./element/forms"))
class LazyElementForms extends LoomElement {}

// ── Store ──

@route("/overview", { group: StoreGroup })
@component("page-store-overview")
@lazy(() => import("./store/overview"))
class LazyStoreOverview extends LoomElement {}

@route("/reactive", { group: StoreGroup })
@component("page-store-reactive")
@lazy(() => import("./store/reactive"))
class LazyStoreReactive extends LoomElement {}

@route("/store-decorator", { group: StoreGroup })
@component("page-store-decorator")
@lazy(() => import("./store/store-decorator"))
class LazyStoreDecorator extends LoomElement {}

@route("/storage", { group: StoreGroup })
@component("page-store-storage")
@lazy(() => import("./store/storage"))
class LazyStoreStorage extends LoomElement {}

@route("/patterns", { group: StoreGroup })
@component("page-store-patterns")
@lazy(() => import("./store/patterns"))
class LazyStorePatterns extends LoomElement {}

@route("/api", { group: StoreGroup })
@component("page-store-api")
@lazy(() => import("./store/api"))
class LazyStoreApi extends LoomElement {}

// ── DI & Services ──

@route("/overview", { group: DIGroup })
@component("page-di-overview")
@lazy(() => import("./di/overview"))
class LazyDIOverview extends LoomElement {}

@route("/decorators", { group: DIGroup })
@component("page-di-decorators")
@lazy(() => import("./di/decorators"))
class LazyDIDecorators extends LoomElement {}

// ── Router ──

@route("/overview", { group: RouterGroup })
@component("page-router-overview")
@lazy(() => import("./router/overview"))
class LazyRouterOverview extends LoomElement {}

@route("/routes", { group: RouterGroup })
@component("page-router-routes")
@lazy(() => import("./router/routes"))
class LazyRouterRoutes extends LoomElement {}

@route("/guards", { group: RouterGroup })
@component("page-router-guards")
@lazy(() => import("./router/guards"))
class LazyRouterGuards extends LoomElement {}

@route("/groups", { group: RouterGroup })
@component("page-router-groups")
@lazy(() => import("./router/groups"))
class LazyRouterGroups extends LoomElement {}

@route("/navigation", { group: RouterGroup })
@component("page-router-navigation")
@lazy(() => import("./router/navigation"))
class LazyRouterNavigation extends LoomElement {}

@route("/route-lifecycle", { group: RouterGroup })
@component("page-route-lifecycle")
@lazy(() => import("./router/route-lifecycle"))
class LazyRouterRouteLifecycle extends LoomElement {}

@route("/decorators", { group: RouterGroup })
@component("page-router-decorators")
@lazy(() => import("./router/decorators"))
class LazyRouterDecorators extends LoomElement {}

// ── Decorators ──

@route("/overview", { group: DecoratorsGroup })
@component("page-decorators-overview")
@lazy(() => import("./decorators/overview"))
class LazyDecoratorsOverview extends LoomElement {}

@route("/events", { group: DecoratorsGroup })
@component("page-decorator-events")
@lazy(() => import("./decorators/events"))
class LazyDecoratorsEvents extends LoomElement {}

@route("/transform", { group: DecoratorsGroup })
@component("page-decorator-transform")
@lazy(() => import("./decorators/transform"))
class LazyDecoratorTransform extends LoomElement {}

// ── Examples ──

@route("/clock", { group: ExamplesGroup })
@component("page-example-clock")
@lazy(() => import("./examples/clock"))
class LazyExampleClock extends LoomElement {}

@route("/todo", { group: ExamplesGroup })
@component("page-example-todo")
@lazy(() => import("./examples/todo"))
class LazyExampleTodo extends LoomElement {}

@route("/theme-switcher", { group: ExamplesGroup })
@component("page-example-theme")
@lazy(() => import("./examples/theme-switcher"))
class LazyExampleTheme extends LoomElement {}

@route("/form", { group: ExamplesGroup })
@component("page-example-form")
@lazy(() => import("./examples/form"))
class LazyExampleForm extends LoomElement {}

@route("/api", { group: ExamplesGroup })
@component("page-example-api")
@lazy(() => import("./examples/api"))
class LazyExampleApi extends LoomElement {}
