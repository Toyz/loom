/**
 * Loom Router — Decorators
 *
 * @route(path, opts?) — registers a component class as a route handler.
 * @guard(name?)       — marks a method as a named route guard.
 * @group(prefix, opts?) — marks a class as a route group with prefix + guards.
 *
 * Both use createDecorator as their foundation.
 */

import { createDecorator } from "../decorators/create";
import { routes, routeByName, guardRegistry, compilePattern, GROUP_META, ROUTE_GROUP, type RouteEntry, type GroupMeta } from "./route";

export const ROUTE_PATH = Symbol("loom:route:path");
export const GUARD_HANDLERS = Symbol("loom:route:guards");

// ── @group (class decorator via createDecorator) ──

interface GroupOptions {
  /** Named guards to check before rendering any route in this group */
  guards?: string[];
}

/**
 * Mark a class as a route group.
 *
 * Groups provide a path prefix and optional guards for child routes.
 * Stacks with @route — the group class can also be a route (layout page).
 *
 * ```ts
 * @group("/user/:profile", { guards: ["auth"] })
 * @route("/")
 * @component("user-layout")
 * class UserLayout extends LoomElement {
 *   update() {
 *     return <div><loom-outlet /></div>;
 *   }
 * }
 *
 * @route("/settings", { group: UserLayout })
 * @component("user-settings")
 * class UserSettings extends LoomElement { }
 * // → resolves to /user/:profile/settings, inherits "auth" guard
 * ```
 */
export const group = createDecorator<[prefix: string, opts?: GroupOptions]>(
  (ctor, prefix, opts) => {
    const meta: GroupMeta = {
      prefix,
      guards: opts?.guards ?? [],
    };
    (ctor as any)[GROUP_META] = meta;

    // Class decorators run bottom-up: @route may have already registered
    // a route entry for this ctor. If so, AND the route belongs to a parent
    // group, patch it with our prefix + guards. (Standalone @group + @route
    // doesn't need patching — @route already has the correct pattern.)
    const existing = routes.find((r) => r.ctor === ctor);
    if (existing && (ctor as any)[ROUTE_GROUP]) {
      const newPattern = existing.pattern + prefix;
      const { regex, paramNames } = compilePattern(newPattern);
      existing.pattern = newPattern;
      existing.regex = regex;
      existing.paramNames = paramNames;
      existing.guards = [...meta.guards, ...existing.guards];
      (ctor as any)[ROUTE_PATH] = newPattern;
    }
  },
  { class: true },
);

// ── Group chain resolution ──

/**
 * Walk the group chain from a constructor up through nested groups.
 * Returns the combined prefix and guards in root → leaf order.
 */
function resolveGroupChain(groupCtor: any): { prefix: string; guards: string[] } {
  const chain: GroupMeta[] = [];
  let current: any = groupCtor;

  while (current?.[GROUP_META]) {
    chain.unshift(current[GROUP_META]);
    // Walk up: if this group itself belongs to another group
    current = current[ROUTE_GROUP];
  }

  let prefix = "";
  let guards: string[] = [];
  for (const g of chain) {
    prefix += g.prefix;
    guards = [...guards, ...g.guards];
  }
  return { prefix, guards };
}

// ── @route (class decorator via createDecorator) ──

interface RouteOptions {
  /** Named guards to check before this route is rendered */
  guards?: string[];
  /** Group constructor this route belongs to */
  group?: any;
  /** Named route identifier for programmatic navigation */
  name?: string;
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
 *
 * @route("/settings", { group: UserLayout })
 * @component("user-settings")
 * class UserSettings extends LoomElement { }
 * ```
 */
export const route = createDecorator<[pattern: string, opts?: RouteOptions]>(
  (ctor, pattern, opts) => {
    // Resolve group chain if this route belongs to a group
    let fullPattern = pattern;
    let allGuards = opts?.guards ?? [];

    if (opts?.group) {
      const chain = resolveGroupChain(opts.group);
      // Normalize: avoid double slashes when pattern is "/"
      fullPattern = pattern === "/"
        ? chain.prefix
        : chain.prefix + pattern;
      allGuards = [...chain.guards, ...allGuards];
      // Store group parent ref for nested group resolution
      (ctor as any)[ROUTE_GROUP] = opts.group;
    }

    (ctor as any)[ROUTE_PATH] = fullPattern;
    const { regex, paramNames } = compilePattern(fullPattern);

    const entry: RouteEntry = {
      pattern: fullPattern,
      regex,
      paramNames,
      get tag() {
        return _tagForCtor(ctor);
      },
      ctor,
      guards: allGuards,
      name: opts?.name,
    };

    // Register named route
    if (opts?.name) {
      if (routeByName.has(opts.name)) {
        console.warn(`[Loom] Duplicate route name: "${opts.name}"`);
      }
      routeByName.set(opts.name, entry);
    }

    if (fullPattern === "*") {
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
