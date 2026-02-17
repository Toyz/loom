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
export function onRouteEnter(method: Function, context: ClassMethodDecoratorContext): void {
  const key = String(context.name);
  context.addInitializer(function (this: any) {
    const proto = Object.getPrototypeOf(this);
    if (!proto[ROUTE_ENTER]) proto[ROUTE_ENTER] = [];
    if (!proto[ROUTE_ENTER].includes(key)) proto[ROUTE_ENTER].push(key);
  });
}

/**
 * Method decorator. Marks a method to be called when navigating away from this route.
 */
export function onRouteLeave(method: Function, context: ClassMethodDecoratorContext): void {
  const key = String(context.name);
  context.addInitializer(function (this: any) {
    const proto = Object.getPrototypeOf(this);
    if (!proto[ROUTE_LEAVE]) proto[ROUTE_LEAVE] = [];
    if (!proto[ROUTE_LEAVE].includes(key)) proto[ROUTE_LEAVE].push(key);
  });
}
