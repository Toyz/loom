/**
 * Loom Router — Route table and decorators
 *
 * @route(path, opts?) registers a component class as a route handler.
 * @guard(name?) marks a method as a named route guard.
 */

import { INJECT_PARAMS } from "../decorators/symbols";

export const ROUTE_PATH = Symbol("loom:route:path");
export const GUARD_HANDLERS = Symbol("loom:route:guards");

export interface RouteEntry {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  tag: string;
  ctor: any;
  /** Named guards to check before rendering this route */
  guards: string[];
}

/** Global route table — populated by @route decorators */
export const routes: RouteEntry[] = [];

/**
 * Global guard registry — populated by @guard decorators.
 * Maps guard name → { proto, key, injectMeta }
 */
export interface GuardRegistration {
  proto: any;
  key: string;
}
export const guardRegistry = new Map<string, GuardRegistration>();

/**
 * Compile a route pattern into a regex + param name list.
 *
 * `/docs/:slug` → { regex: /^\/docs\/([^/]+)$/, paramNames: ["slug"] }
 * `*`           → { regex: /^.*$/, paramNames: [] }
 */
function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  if (pattern === "*") {
    return { regex: /^.*$/, paramNames: [] };
  }

  const paramNames: string[] = [];
  const regexStr = pattern
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) {
        paramNames.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("\\/");

  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

/**
 * Match a path against the route table.
 * Returns the matched entry + extracted params, or null.
 */
export function matchRoute(path: string): { entry: RouteEntry; params: Record<string, string> } | null {
  for (const entry of routes) {
    const m = path.match(entry.regex);
    if (m) {
      const params: Record<string, string> = {};
      entry.paramNames.forEach((name, i) => {
        params[name] = m[i + 1];
      });
      return { entry, params };
    }
  }
  return null;
}

// ── @route decorator ──

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
export function route(pattern: string, opts?: RouteOptions) {
  return (ctor: any) => {
    (ctor as any)[ROUTE_PATH] = pattern;
    const { regex, paramNames } = compilePattern(pattern);

    // Defer tag resolution — the @component decorator may not have run yet.
    // We use a getter to lazily resolve the custom element tag.
    const entry: RouteEntry = {
      pattern,
      regex,
      paramNames,
      get tag() {
        // Find the tag registered for this constructor
        return _tagForCtor(ctor);
      },
      ctor,
      guards: opts?.guards ?? [],
    };

    // Wildcard goes last
    if (pattern === "*") {
      routes.push(entry);
    } else {
      // Insert before wildcards
      const wildcardIdx = routes.findIndex((r) => r.pattern === "*");
      if (wildcardIdx === -1) routes.push(entry);
      else routes.splice(wildcardIdx, 0, entry);
    }
  };
}

/** Resolve the custom element tag for a constructor */
function _tagForCtor(ctor: any): string {
  // Search customElements registry
  const name = (customElements as any).getName?.(ctor);
  if (name) return name;

  // Fallback: scan internal app registry (custom elements v1 doesn't have getName everywhere)
  // We store the tag on the constructor via @component
  return (ctor as any).__loom_tag ?? ctor.name.toLowerCase();
}

// ── @guard decorator ──

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
 * @guard
 * checkRole(@inject(UserStore) users: UserStore) {
 *   return users.current?.role === "admin" ? true : "/forbidden";
 * }
 * ```
 */
export function guard(nameOrTarget: any, key?: string): any {
  if (typeof key === "string") {
    // Bare @guard (no name) — derive name from method name
    _registerGuard(nameOrTarget, key, key);
    return;
  }

  if (typeof nameOrTarget === "string") {
    // @guard("auth") — factory form with explicit name
    return (target: any, methodKey: string) => {
      _registerGuard(target, methodKey, nameOrTarget);
    };
  }
}

function _registerGuard(proto: any, key: string, name: string): void {
  // Legacy: store on prototype for backward compat
  if (!proto[GUARD_HANDLERS]) proto[GUARD_HANDLERS] = [];
  proto[GUARD_HANDLERS].push(key);

  // New: register in global registry by name
  guardRegistry.set(name, { proto, key });
}
