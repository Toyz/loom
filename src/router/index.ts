/**
 * Loom Router — Barrel exports
 */

// Mode
export { type RouterMode, HashMode, HistoryMode } from "./mode.js";

// Events
export { RouteChanged } from "./events.js";

// Route table & matching
export { matchRoute, routes, guardRegistry, routeByName, buildPath } from "./route.js";
export type { RouteEntry, GuardRegistration, GroupMeta } from "./route.js";
export { GROUP_META, ROUTE_GROUP } from "./route.js";

// Route decorators
export { route, guard, group, ROUTE_PATH, GUARD_HANDLERS } from "./decorators.js";

// Route data sentinels (for @prop({params}) and @prop({query: routeQuery}))
export { params, routeQuery, routeMeta } from "../store/decorators.js";
export { transform } from "../transform/transform.js";

// Router service
export { LoomRouter } from "./router.js";
export type { RouterOptions, RouteInfo, RouteTarget } from "./router.js";

// Components
export { LoomOutlet } from "./outlet.js";
export { LoomLink } from "./link.js";

// Route lifecycle
export { onRouteEnter, onRouteLeave } from "./route-lifecycle.js";

// URL part decorators
export { subdomain, domain, tld } from "./url.js";
