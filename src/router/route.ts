/**
 * Loom Router — Route table and matching
 *
 * Pure data: route entries, pattern compilation, and path matching.
 * Decorators live in ./decorators.ts.
 */

export interface RouteEntry {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  tag: string;
  ctor: any;
  /** Named guards to check before rendering this route */
  guards: string[];
}

/** Global route table — populated by @route decorator */
export const routes: RouteEntry[] = [];

/**
 * Global guard registry — populated by @guard decorator.
 * Maps guard name → { proto, key }
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
export function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
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
