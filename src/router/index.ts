/**
 * Loom Router — Barrel exports
 */

// Mode
export { type RouterMode, HashMode, HistoryMode } from "./mode";

// Events
export { RouteChanged } from "./events";

// Route table & matching
export { matchRoute, routes, guardRegistry } from "./route";
export type { RouteEntry, GuardRegistration } from "./route";

// Route decorators
export { route, guard, ROUTE_PATH, GUARD_HANDLERS } from "./decorators";

// Route data sentinels (for @prop({params}) and @prop({query: routeQuery}))
export { params, routeQuery } from "../store/decorators";
export { transform } from "../transform/transform";

// Router service
export { LoomRouter } from "./router";
export type { RouterOptions, RouteInfo } from "./router";

// Components
export { LoomOutlet } from "./outlet";
export { LoomLink } from "./link";
