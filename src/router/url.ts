/**
 * Loom Router — URL part decorators (TC39 Stage 3)
 *
 * @subdomain — auto-accessor initialised to the subdomain of the current hostname
 * @domain    — auto-accessor initialised to the domain label
 * @tld       — auto-accessor initialised to the effective TLD (handles .co.uk etc.)
 *
 * These are "set-and-forget" decorators: the value is derived once at
 * construction time from `window.location.hostname` and never changes.
 * No reactive backing, no connect hooks — just override `init()`.
 *
 * ```ts
 * @subdomain accessor tenant = "";  // "tenant.app.co.uk" → "tenant"
 * @domain    accessor host   = "";  // "tenant.app.co.uk" → "app"
 * @tld       accessor ext    = "";  // "tenant.app.co.uk" → "co.uk"
 * ```
 *
 * Optimisations:
 *  - TWO_PART_TLDS is lazy-initialised (no alloc if decorators are unused)
 *  - Parsed hostname is cached globally (hostname never changes in a SPA)
 *  - Per-instance overrides share a single WeakMap across all URL decorators
 */

// ── Known 2-part TLDs (lazy) ──────────────────────────────────────────────────
// Covers the most common compound TLDs without shipping the full PSL (~100 kb).
// Source: IANA + real-world frequency. Add entries as needed.

let _tlds: Set<string> | null = null;
function getTlds(): Set<string> {
  return _tlds ??= new Set([
    // UK
    "co.uk","org.uk","me.uk","net.uk","ltd.uk","plc.uk","gov.uk","sch.uk","ac.uk","mod.uk",
    // Australia
    "com.au","net.au","org.au","edu.au","gov.au","id.au","asn.au",
    // New Zealand
    "co.nz","net.nz","org.nz","govt.nz","school.nz","ac.nz",
    // Japan
    "co.jp","ne.jp","or.jp","ed.jp","ac.jp","go.jp","ad.jp",
    // Brazil
    "com.br","net.br","org.br","gov.br","edu.br","ind.br",
    // India
    "co.in","net.in","org.in","gen.in","firm.in","gov.in",
    // South Africa
    "co.za","net.za","org.za","gov.za","edu.za",
    // South Korea
    "co.kr","or.kr","go.kr","ne.kr","ac.kr",
    // China
    "com.cn","net.cn","org.cn","gov.cn","edu.cn","ac.cn",
    // Hong Kong
    "com.hk","net.hk","org.hk","edu.hk","gov.hk",
    // Singapore
    "com.sg","net.sg","org.sg","edu.sg","gov.sg",
    // Malaysia
    "com.my","net.my","org.my","edu.my","gov.my",
    // Others
    "co.id","co.th","com.ph","com.ar","net.ar","com.mx","com.co",
    "co.ie","com.cy","com.pk","net.pk","com.sg","co.tt","co.ke",
    "com.ng","com.eg","com.tr","com.tw","com.vn","com.ua",
  ]);
}

// ── Parser ────────────────────────────────────────────────────────────────────

interface ParsedHostname {
  subdomain: string;
  domain:    string;
  tld:       string;
}

/** @internal — exported for unit tests only */
export function parseHostname(hostname?: string): ParsedHostname {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");

  const parts = host.split(".");

  if (parts.length === 1) {
    return { subdomain: "", domain: parts[0], tld: "" };
  }

  if (parts.length === 2) {
    return { subdomain: "", domain: parts[0], tld: parts[1] };
  }

  // Check if the last two labels form a known compound TLD (e.g. "co.uk")
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  const tldLen  = getTlds().has(lastTwo) ? 2 : 1;

  return {
    tld:       parts.slice(-tldLen).join("."),
    domain:    parts[parts.length - tldLen - 1],
    subdomain: parts.slice(0, -tldLen - 1).join("."),
  };
}

// ── Cached parse result ──────────────────────────────────────────────────────
// Hostname never changes in a SPA — parse once for the entire app lifetime.

let _cached: ParsedHostname | null = null;
function getCached(): ParsedHostname {
  return _cached ??= parseHostname();
}

/** @internal — exported so tests can reset the cache between runs */
export function _resetCache(): void { _cached = null; }

// ── Shared per-instance override storage ─────────────────────────────────────
// A single WeakMap for all URL decorators. Each instance maps to an object
// with optional per-field overrides set via the setter.

const overrides = new WeakMap<object, Partial<ParsedHostname & { domainFull: string }>>();
function getOverrides(instance: object) {
  let o = overrides.get(instance);
  if (!o) { o = {}; overrides.set(instance, o); }
  return o;
}

// ── Factory ──────────────────────────────────────────────────────────────────

function urlPart(part: keyof ParsedHostname) {
  return function <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, string>,
    _context: ClassAccessorDecoratorContext<This, string>,
  ): ClassAccessorDecoratorResult<This, string> {
    return {
      get(this: This): string {
        const o = overrides.get(this);
        return o?.[part] ?? getCached()[part];
      },
      set(this: This, value: string): void {
        getOverrides(this)[part] = value;
      },
    };
  };
}

// ── Public decorators ─────────────────────────────────────────────────────────

/**
 * Auto-accessor initialised to the subdomain of `window.location.hostname`.
 *
 * ```ts
 * @subdomain accessor tenant = "";
 * // tenant.app.com → "tenant"
 * // a.b.app.com    → "a.b"
 * // app.com        → ""
 * ```
 */
export const subdomain = urlPart("subdomain");

// ── @domain — bare or @domain("full") ────────────────────────────────────────

type DomainMode = "full";

type DomainDecorator = <This extends object>(
  target: ClassAccessorDecoratorTarget<This, string>,
  context: ClassAccessorDecoratorContext<This, string>,
) => ClassAccessorDecoratorResult<This, string>;

function makeDomainDecorator(full: boolean): DomainDecorator {
  return function <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, string>,
    _context: ClassAccessorDecoratorContext<This, string>,
  ): ClassAccessorDecoratorResult<This, string> {
    const overrideKey = full ? "domainFull" as const : "domain" as const;
    return {
      get(this: This): string {
        const o = overrides.get(this);
        if (o?.[overrideKey] !== undefined) return o[overrideKey]!;
        const { domain: d, tld: t } = getCached();
        return full && t ? `${d}.${t}` : d;
      },
      set(this: This, value: string): void {
        getOverrides(this)[overrideKey] = value;
      },
    };
  };
}

/**
 * Auto-accessor initialised to the domain label of `window.location.hostname`.
 *
 * Bare form — returns just the domain label:
 * ```ts
 * @domain accessor host = "";
 * // tenant.app.com → "app"
 * // app.com        → "app"
 * // localhost      → "localhost"
 * ```
 *
 * Factory form `"full"` — returns `domain.tld`:
 * ```ts
 * @domain("full") accessor host = "";
 * // tenant.app.com → "app.com"
 * // a.b.app.co.uk  → "app.co.uk"
 * // localhost       → "localhost" (no TLD → just the label)
 * ```
 */
export function domain(mode: DomainMode): DomainDecorator;
export function domain<This extends object>(
  target: ClassAccessorDecoratorTarget<This, string>,
  context: ClassAccessorDecoratorContext<This, string>,
): ClassAccessorDecoratorResult<This, string>;
export function domain<This extends object>(
  targetOrMode: ClassAccessorDecoratorTarget<This, string> | DomainMode,
  context?: ClassAccessorDecoratorContext<This, string>,
): ClassAccessorDecoratorResult<This, string> | DomainDecorator {
  if (typeof targetOrMode === "string") {
    // @domain("full") — factory form
    return makeDomainDecorator(true);
  }
  // bare @domain
  return makeDomainDecorator(false)(targetOrMode, context!);
}

/**
 * Auto-accessor initialised to the TLD (last hostname label(s)).
 *
 * ```ts
 * @tld accessor ext = "";
 * // tenant.app.com → "com"
 * // app.co.uk      → "co.uk"
 * // localhost      → ""
 * ```
 */
export const tld = urlPart("tld");

