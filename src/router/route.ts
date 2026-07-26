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
  ctor: Function;
  /** Named guards to check before rendering this route */
  guards: string[];
  /** Optional name for named-route navigation */
  name?: string;
  /** Arbitrary metadata — merged from group + route */
  meta: Record<string, unknown>;
}

/** Symbol for @group metadata on a constructor */
export const GROUP_META = Symbol("loom:route:group");

/** Symbol for storing a route's group parent constructor */
export const ROUTE_GROUP = Symbol("loom:route:group-parent");

/** Metadata stored by @group on a constructor */
export interface GroupMeta {
  prefix: string;
  guards: string[];
  /** Arbitrary metadata inherited by child routes */
  meta: Record<string, unknown>;
}

/** Global route table — populated by @route decorator */
export const routes: RouteEntry[] = [];

/** Named route lookup — populated by @route when name is provided */
export const routeByName = new Map<string, RouteEntry>();

/**
 * Global guard registry — populated by @guard decorator.
 * Maps guard name → { proto, key }
 */
export interface GuardRegistration {
  method: Function;
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
      // A bare "*" segment is a splat: match the rest of the path.
      if (seg === "*") {
        paramNames.push("wildcard");
        return "(.*)";
      }
      // Escape each side of an in-segment "*" and join with a wildcard, so
      // `/files/*.png` matches `/files/logo.png`. Previously the "*" was
      // regex-escaped into a literal asterisk and the route matched only the
      // URL "/files/*.png".
      return seg
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*");
    })
    .join("\\/");

  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

/**
 * Percent-decode a route param, tolerating malformed input.
 *
 * Hash mode round-trips through the URL object, whose hash setter
 * percent-encodes, so `/user/Ada Lovelace` comes back as `Ada%20Lovelace`.
 * A stray "%" makes decodeURIComponent throw URIError, which would take down
 * routing entirely — fall back to the raw value.
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
        params[name] = safeDecode(m[i + 1]);
      });
      return { entry, params };
    }
  }
  return null;
}

/**
 * Build a path from a named route, substituting :param segments.
 *
 * ```ts
 * buildPath("user-detail", { id: "42" }); // → "/user/42"
 * ```
 */
export function buildPath(name: string, params: Record<string, string> = {}): string {
  const entry = routeByName.get(name);
  if (!entry) throw new Error(`[Loom] Unknown route name: "${name}"`);

  return entry.pattern.replace(/:([^/]+)/g, (_, key) => {
    if (!(key in params)) throw new Error(`[Loom] Missing param "${key}" for route "${name}"`);
    // Encode so values containing spaces, slashes or "#" round-trip. Without
    // this, buildPath("user", { id: "a/b" }) produced "/user/a/b", which then
    // matched a different two-segment route.
    return encodeURIComponent(params[key]);
  });
}
