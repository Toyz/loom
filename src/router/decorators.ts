/**
 * Loom Router — Decorators
 *
 * @route(path, opts?) — registers a component class as a route handler.
 * @guard(name?)       — marks a method as a named route guard.
 *
 * Both use createDecorator as their foundation.
 */

import { createDecorator } from "../decorators/create";
import { routes, guardRegistry, compilePattern, type RouteEntry } from "./route";

export const ROUTE_PATH = Symbol("loom:route:path");
export const GUARD_HANDLERS = Symbol("loom:route:guards");

// ── @route (class decorator via createDecorator) ──

interface RouteOptions {
  /** Named guards to check before this route is rendered */
  guards?: string[];
}

/**
 * Register a class as a route handler.
 *
 * ```ts
 * @route("/docs/:slug")
 * @component("page-docs")
 * class PageDocs extends LoomElement { ... }
 *
 * @route("/admin", { guards: ["auth", "role"] })
 * @component("page-admin")
 * class PageAdmin extends LoomElement { ... }
 * ```
 */
export const route = createDecorator<[pattern: string, opts?: RouteOptions]>(
  (ctor, pattern, opts) => {
    (ctor as any)[ROUTE_PATH] = pattern;
    const { regex, paramNames } = compilePattern(pattern);

    const entry: RouteEntry = {
      pattern,
      regex,
      paramNames,
      get tag() {
        return _tagForCtor(ctor);
      },
      ctor,
      guards: opts?.guards ?? [],
    };

    if (pattern === "*") {
      routes.push(entry);
    } else {
      const wildcardIdx = routes.findIndex((r) => r.pattern === "*");
      if (wildcardIdx === -1) routes.push(entry);
      else routes.splice(wildcardIdx, 0, entry);
    }
  },
  { class: true },
);

/** Resolve the custom element tag for a constructor */
function _tagForCtor(ctor: any): string {
  const name = (customElements as any).getName?.(ctor);
  if (name) return name;
  return (ctor as any).__loom_tag ?? ctor.name.toLowerCase();
}

// ── @guard (define-time method decorator via createDecorator) ──

/**
 * Mark a method as a named route guard.
 *
 * Return `true` to allow, `false` to block, or a `string` to redirect.
 * Async guards are awaited. Supports @inject on parameters.
 *
 * ```ts
 * @guard("auth")
 * checkAuth(@inject(AuthService) auth: AuthService) {
 *   return auth.isLoggedIn ? true : "/login";
 * }
 *
 * // Derived name from method name:
 * @guard()
 * checkRole(@inject(UserStore) users: UserStore) {
 *   return users.current?.role === "admin" ? true : "/forbidden";
 * }
 * ```
 */
export const guard = createDecorator<[name?: string]>(
  (proto, key, name) => {
    const guardName = name ?? key;
    if (!proto[GUARD_HANDLERS]) proto[GUARD_HANDLERS] = [];
    proto[GUARD_HANDLERS].push(key);
    guardRegistry.set(guardName, { proto, key });
  },
);

