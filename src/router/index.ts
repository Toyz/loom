/**
 * Loom Router — Barrel exports
 */

// Mode
export { type RouterMode, HashMode, HistoryMode } from "./mode";

// Events
export { RouteChanged } from "./events";

// Route table & matching
export { matchRoute, routes, guardRegistry, routeByName, buildPath } from "./route";
export type { RouteEntry, GuardRegistration, GroupMeta } from "./route";
export { GROUP_META, ROUTE_GROUP } from "./route";

// Route decorators
export { route, guard, group, ROUTE_PATH, GUARD_HANDLERS } from "./decorators";

// Route data sentinels (for @prop({params}) and @prop({query: routeQuery}))
export { params, routeQuery, routeMeta } from "../store/decorators";
export { transform } from "../transform/transform";

// Router service
export { LoomRouter } from "./router";
export type { RouterOptions, RouteInfo, RouteTarget } from "./router";

// Components
export { LoomOutlet } from "./outlet";
export { LoomLink } from "./link";

// Route lifecycle
export { onRouteEnter, onRouteLeave } from "./route-lifecycle";
