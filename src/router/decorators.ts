/**
 * Loom Router — Decorators (TC39 Stage 3)
 *
 * @route(path, opts?) — registers a component class as a route handler.
 * @guard(name?)       — marks a method as a named route guard.
 * @group(prefix, opts?) — marks a class as a route group with prefix + guards.
 *
 * All use createDecorator as their foundation.
 */

import { createDecorator } from "../decorators/create";
import { routes, routeByName, guardRegistry, compilePattern, GROUP_META, ROUTE_GROUP, type RouteEntry, type GroupMeta } from "./route";

export const ROUTE_PATH = Symbol("loom:route:path");
export const GUARD_HANDLERS = Symbol("loom:route:guards");

// ── @group (class decorator via createDecorator) ──

interface GroupOptions {
  /** Named guards to check before rendering any route in this group */
  guards?: string[];
  /** Arbitrary metadata inherited by child routes */
  meta?: Record<string, unknown>;
}

/**
 * Mark a class as a route group.
 *
 * ```ts
 * @group("/user/:profile", { guards: ["auth"] })
 * @route("/")
 * @component("user-layout")
 * class UserLayout extends LoomElement { ... }
 * ```
 */
export const group = createDecorator<[prefix: string, opts?: GroupOptions]>(
  (ctor, prefix, opts) => {
    const meta: GroupMeta = {
      prefix,
      guards: opts?.guards ?? [],
      meta: opts?.meta ?? {},
    };
    (ctor as unknown as Record<symbol, unknown>)[GROUP_META] = meta;

    const existing = routes.find((r) => r.ctor === ctor);
    if (existing && (ctor as unknown as Record<symbol, unknown>)[ROUTE_GROUP]) {
      const newPattern = existing.pattern + prefix;
      const { regex, paramNames } = compilePattern(newPattern);
      existing.pattern = newPattern;
      existing.regex = regex;
      existing.paramNames = paramNames;
      existing.guards = [...meta.guards, ...existing.guards];
      (ctor as unknown as Record<symbol, unknown>)[ROUTE_PATH] = newPattern;
    }
  },
  { class: true },
);

// ── Group chain resolution ──

function resolveGroupChain(groupCtor: Function): { prefix: string; guards: string[]; meta: Record<string, unknown> } {
  const chain: GroupMeta[] = [];
  let current: Function | unknown = groupCtor;

  while (current && (current as Record<symbol, unknown>)[GROUP_META]) {
    chain.unshift((current as Record<symbol, unknown>)[GROUP_META] as GroupMeta);
    current = (current as Record<symbol, unknown>)[ROUTE_GROUP];
  }

  let prefix = "";
  let guards: string[] = [];
  let meta: Record<string, unknown> = {};
  for (const g of chain) {
    prefix += g.prefix;
    guards = [...guards, ...g.guards];
    meta = { ...meta, ...g.meta };
  }
  return { prefix, guards, meta };
}

// ── @route (class decorator via createDecorator) ──

interface RouteOptions {
  /** Named guards to check before this route is rendered */
  guards?: string[];
  /** Group constructor this route belongs to */
  group?: Function;
  /** Named route identifier for programmatic navigation */
  name?: string;
  /** Arbitrary metadata accessible to guards and lifecycle hooks */
  meta?: Record<string, unknown>;
}

/**
 * Register a class as a route handler.
 *
 * ```ts
 * @route("/docs/:slug")
 * @component("page-docs")
 * class PageDocs extends LoomElement { ... }
 * ```
 */
export const route = createDecorator<[pattern: string, opts?: RouteOptions]>(
  (ctor, pattern, opts) => {
    let fullPattern = pattern;
    let allGuards = opts?.guards ?? [];
    let allMeta: Record<string, unknown> = opts?.meta ?? {};

    if (opts?.group) {
      const chain = resolveGroupChain(opts.group);
      fullPattern = pattern === "/"
        ? chain.prefix
        : chain.prefix + pattern;
      allGuards = [...chain.guards, ...allGuards];
      allMeta = { ...chain.meta, ...allMeta }; // route-level overrides group
      (ctor as unknown as Record<symbol, unknown>)[ROUTE_GROUP] = opts.group;
    }

    (ctor as unknown as Record<symbol, unknown>)[ROUTE_PATH] = fullPattern;
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
      meta: allMeta,
    };

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
function _tagForCtor(ctor: Function): string {
  const name = (customElements as unknown as { getName?: (ctor: Function) => string | undefined }).getName?.(ctor);
  if (name) return name;
  return (ctor as unknown as Record<string, unknown>).__loom_tag as string ?? ctor.name.toLowerCase();
}

// ── @guard (method decorator — raw TC39, not createDecorator) ──

/**
 * Mark a method as a named route guard.
 *
 * Guards always receive `RouteInfo` as their first argument,
 * giving access to `path`, `params`, `tag`, and `meta`.
 * Additional `@inject` parameters follow after RouteInfo.
 *
 * When used on a @service class, the guard automatically binds
 * to the service instance, enabling @inject accessors to resolve.
 *
 * ```ts
 * @service
 * class AuthGuards {
 *   @inject(AuthStore) accessor auth!: AuthStore;
 *
 *   @guard("auth")
 *   checkAuth(route: RouteInfo) {
 *     if (!this.auth.isLoggedIn) return "/login";
 *     if (route.meta.role === "admin" && !this.auth.isAdmin) return "/forbidden";
 *     return true;
 *   }
 * }
 * ```
 */
export function guard(name?: string) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    const key = String(context.name);
    const guardName = name ?? key;

    // Register immediately with the raw method (define-time)
    guardRegistry.set(guardName, { method, key });

    // When the owning class is instantiated, rebind to the live instance
    // so @inject accessors (which need `this`) resolve correctly.
    context.addInitializer(function () {
      guardRegistry.set(guardName, {
        method: method.bind(this),
        key,
      });
    });
  };
}
