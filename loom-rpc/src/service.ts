/**
 * LoomRPC — @service class decorator
 *
 * Stamps a minification-safe name on a router contract class.
 * `@rpc` and `@mutate` read this name first, falling back to `class.name`.
 *
 * ```ts
 * import { service } from "@toyz/loom-rpc";
 *
 * @service("UserService")
 * class UserService {
 *   getUser(id: string): User { return null!; }
 * }
 * ```
 */

/** Symbol used to store the service name on the class */
export const SERVICE_NAME = Symbol.for("loom-rpc:service");

/**
 * @service(name) — Class decorator
 *
 * Assigns a stable, minification-proof name to a router contract.
 * When present, `@rpc` and `@mutate` use this name instead of `class.name`.
 *
 * @param name - The stable service name (survives minification)
 */
export function service(name: string) {
  return <T extends new (...args: any[]) => any>(target: T, _context?: ClassDecoratorContext) => {
    (target as any)[SERVICE_NAME] = name;
    return target;
  };
}

/**
 * Resolve the router name for a class: @service name first, then class.name.
 */
export function resolveServiceName(router: new (...args: any[]) => any): string {
  return (router as any)[SERVICE_NAME] ?? router.name;
}
