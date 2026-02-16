/**
 * Loom Router — Barrel exports
 */

// Mode
export { type RouterMode, HashMode, HistoryMode } from "./mode";

// Events
export { RouteChanged } from "./events";

// Route table & decorators
export { route, guard, matchRoute, routes, guardRegistry } from "./route";
export type { RouteEntry, GuardRegistration } from "./route";

// Route data sentinels (for @prop({params}) and @prop({query: routeQuery}))
export { params, routeQuery } from "../decorators/state";
export { transform } from "../decorators/transform";

// Router service
export { LoomRouter } from "./router";
export type { RouterOptions, RouteInfo } from "./router";

// Components
export { LoomOutlet } from "./outlet";
export { LoomLink } from "./link";
