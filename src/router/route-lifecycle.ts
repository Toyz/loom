/**
 * Loom — Route lifecycle decorators
 *
 * @onRouteEnter — Fires when the decorated route component becomes active
 * @onRouteLeave — Fires when navigating away from the decorated route component
 *
 * ```ts
 * @route("/dashboard")
 * @component("page-dashboard")
 * class Dashboard extends LoomElement {
 *   @onRouteEnter
 *   entered(params: Record<string, string>) { }
 *
 *   @onRouteLeave
 *   left() { }
 * }
 * ```
 */

import { ROUTE_ENTER, ROUTE_LEAVE } from "../decorators/symbols";

/**
 * Method decorator. Marks a method to be called when this route is entered.
 * The method receives (params, query) from the matched route.
 */
export function onRouteEnter(target: any, key: string): void {
  if (!target[ROUTE_ENTER]) target[ROUTE_ENTER] = [];
  target[ROUTE_ENTER].push(key);
}

/**
 * Method decorator. Marks a method to be called when navigating away from this route.
 */
export function onRouteLeave(target: any, key: string): void {
  if (!target[ROUTE_LEAVE]) target[ROUTE_LEAVE] = [];
  target[ROUTE_LEAVE].push(key);
}
