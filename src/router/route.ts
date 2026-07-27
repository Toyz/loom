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
 * How specific a single pattern segment is. Lower wins.
 *
 * The ordering is the obvious one, written down: an exact segment beats a
 * partial match, which beats a named param, which beats a splat.
 */
const enum Rank {
  Static = 0,
  Partial = 1, // "*.png" -- fixed text plus a wildcard
  Param = 2,   // ":id"
  Splat = 3,   // "*" -- swallows the rest
}

function rankSegment(seg: string): Rank {
  if (seg === "*") return Rank.Splat;
  if (seg.startsWith(":")) return Rank.Param;
  return seg.includes("*") ? Rank.Partial : Rank.Static;
}

/**
 * Order two patterns by specificity, most specific first. 0 keeps them in
 * registration order.
 *
 * Segment by segment, because a single score cannot separate `/user/:id/edit`
 * from `/user/new/:tab` -- both have one static and one dynamic segment after
 * `/user`, and which should win depends on where they sit, not how many there
 * are. The first segment the two disagree on decides it, exactly as a reader
 * comparing the patterns would.
 */
function compareSpecificity(a: string, b: string): number {
  // The bare catch-all is last by definition, not by segment count.
  if (a === "*") return b === "*" ? 0 : 1;
  if (b === "*") return -1;

  const as = a.split("/");
  const bs = b.split("/");
  const n = Math.min(as.length, bs.length);
  for (let i = 0; i < n; i++) {
    const d = rankSegment(as[i]!) - rankSegment(bs[i]!);
    if (d !== 0) return d;
  }
  // Same shape as far as both go: the longer pattern is the more specific one,
  // and can only be reached past a splat in the shorter.
  return bs.length - as.length;
}

/**
 * Add a route to the table, keeping it ordered by specificity.
 *
 * matchRoute() takes the first pattern that matches, so before this the table
 * was in import order and `@route("/user/:id")` loaded first swallowed
 * `/user/new` -- the more specific route was unreachable, and the fix was to
 * reorder imports, which nothing about the code suggested. Only the bare "*"
 * catch-all was special-cased.
 *
 * Sorted on insert rather than at match time so matchRoute keeps its early
 * exit; registration happens once per route at class-definition time, and
 * route tables are small.
 *
 * Ties hold registration order: the insert goes after every entry that is at
 * least as specific, so two identical patterns still resolve first-registered.
 */
export function insertRoute(entry: RouteEntry): void {
  let i = routes.length;
  while (i > 0 && compareSpecificity(entry.pattern, routes[i - 1]!.pattern) < 0) i--;
  routes.splice(i, 0, entry);
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
