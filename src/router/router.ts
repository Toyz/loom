/**
 * Loom Router — LoomRouter service
 *
 * Dual-mode (hash/history) router with named guard support.
 * Register via app.use(new LoomRouter({ mode: "hash" }))
 */

import { bus } from "../bus";
import { type RouterMode, HashMode, HistoryMode } from "./mode";
import { matchRoute, guardRegistry, buildPath } from "./route";
import { LoomResult } from "../result";
import { GUARD_HANDLERS } from "./decorators";
import { RouteChanged } from "./events";
import { INJECT_PARAMS, ROUTE_ENTER, ROUTE_LEAVE } from "../decorators/symbols";
import { app } from "../app";
import type { LoomLifecycle } from "../lifecycle";

export interface RouterOptions {
  mode?: "hash" | "history";
}

/** Target for programmatic navigation — raw path or named route */
export type RouteTarget = string | { name: string; params?: Record<string, string> };

export interface RouteInfo {
  path: string;
  params: Record<string, string>;
  tag: string | null;
  meta: Record<string, unknown>;
}

/** Max guard redirect hops before aborting (prevents infinite loops) */
const MAX_GUARD_REDIRECTS = 10;

export class LoomRouter implements LoomLifecycle<"start" | "stop"> {
  readonly mode: RouterMode;
  private _current: RouteInfo = { path: "/", params: {}, tag: null, meta: {} };
  private _previousTag: string | null = null;
  private _cleanup: (() => void) | null = null;
  /** Optional outlet reference for lifecycle dispatch */
  private _outlet: HTMLElement | null = null;
  /** Monotonic navigation ID — used to discard stale async navigations */
  private _navId = 0;

  /** Register the outlet so lifecycle hooks can find rendered elements */
  setOutlet(el: HTMLElement): void {
    this._outlet = el;
  }

  constructor(opts: RouterOptions = {}) {
    this.mode = opts.mode === "history" ? new HistoryMode() : new HashMode();
  }

  /** Current route info (read-only snapshot) */
  get current(): Readonly<RouteInfo> {
    return this._current;
  }

  /** Start listening for URL changes and resolve the initial route */
  start(): void {
    if (this._cleanup) return; // already started
    this._cleanup = this.mode.listen(() => this._resolveWithGuards());
    this._resolveWithGuards();
  }

  /** Stop listening for URL changes (called automatically by app.stop()) */
  stop(): void {
    this._cleanup?.();
    this._cleanup = null;
  }

  /** Navigate to a path or named route */
  async go(target: RouteTarget, _depth = 0): Promise<void> {
    if (_depth >= MAX_GUARD_REDIRECTS) {
      console.error(`[LoomRouter] Guard redirect loop detected (>${MAX_GUARD_REDIRECTS} hops). Aborting navigation.`);
      return;
    }
    const id = ++this._navId;
    const path = this._resolvePath(target);
    const allowed = await this._checkGuards(path);
    if (id !== this._navId) return; // stale — a newer navigation started
    if (allowed === false) return;
    if (typeof allowed === "string") {
      return this.go(allowed, _depth + 1);
    }
    this.mode.write(path);
    this._doRender(); // guards already ran — skip re-check
  }

  /** Alias for go() */
  navigate(target: RouteTarget): Promise<void> {
    return this.go(target);
  }

  /** Navigate without creating a history entry */
  async replace(target: RouteTarget, _depth = 0): Promise<void> {
    if (_depth >= MAX_GUARD_REDIRECTS) {
      console.error(`[LoomRouter] Guard redirect loop detected (>${MAX_GUARD_REDIRECTS} hops). Aborting navigation.`);
      return;
    }
    const id = ++this._navId;
    const path = this._resolvePath(target);
    const allowed = await this._checkGuards(path);
    if (id !== this._navId) return; // stale — a newer navigation started
    if (allowed === false) return;
    if (typeof allowed === "string") {
      return this.replace(allowed, _depth + 1);
    }
    this.mode.replace(path);
    this._doRender(); // guards already ran — skip re-check
  }

  /** Go back in history */
  back(): void {
    history.back();
  }

  /** Go forward in history */
  forward(): void {
    history.forward();
  }

  /** Build an href for the current mode */
  href(target: RouteTarget): string {
    return this.mode.href(this._resolvePath(target));
  }

  /** Resolve a RouteTarget to a path string */
  private _resolvePath(target: RouteTarget): string {
    if (typeof target === "string") return this._normalizePath(target);
    return this._normalizePath(buildPath(target.name, target.params));
  }

  /**
   * Normalize a path:
   * - Strip query strings (`/store?tab=2` → `/store`)
   * - Strip trailing slashes (`/store/` → `/store`)
   * - Ensure leading slash
   */
  private _normalizePath(path: string): string {
    // Strip query string
    const qIdx = path.indexOf("?");
    if (qIdx !== -1) path = path.slice(0, qIdx);
    // Strip trailing slash (but keep root "/")
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    // Ensure leading slash
    if (!path.startsWith("/")) path = "/" + path;
    return path;
  }

  /**
   * Async entry point for URL listener and initial load.
   * Runs guards before rendering — handles direct URL entry,
   * page refresh, and browser back/forward.
   */
  private async _resolveWithGuards(_depth = 0): Promise<void> {
    if (_depth >= MAX_GUARD_REDIRECTS) {
      console.error(`[LoomRouter] Guard redirect loop on URL change (>${MAX_GUARD_REDIRECTS} hops). Aborting.`);
      return;
    }
    const id = ++this._navId;
    const path = this._normalizePath(this.mode.read());
    const allowed = await this._checkGuards(path);
    if (id !== this._navId) return; // superseded by a newer navigation
    if (allowed === false) {
      // Blocked with no redirect — bounce back to previous path or root
      const prev = this._current.path;
      this.mode.replace(prev !== path ? prev : "/");
      this._doRender();
      return;
    }
    if (typeof allowed === "string") {
      this.mode.replace(this._normalizePath(allowed));
      return this._resolveWithGuards(_depth + 1);
    }
    this._doRender();
  }

  /** Pure render — called after guards have already passed. */
  private _doRender(): void {
    this._resolve();
  }

  private _resolve(): void {
    const path = this._normalizePath(this.mode.read());

    const match = matchRoute(path);
    const previous = this._current.path;
    const newTag = match?.entry.tag ?? null;

    // ── Route lifecycle hooks ──
    const tagChanged = this._previousTag !== newTag;
    const pathChanged = previous !== path;

    // Call @onRouteLeave on the old element
    if (tagChanged && this._previousTag && this._outlet) {
      const oldEl = this._outlet.shadowRoot?.querySelector(this._previousTag)
        ?? this._outlet.querySelector(this._previousTag);
      if (oldEl) {
        const handlers: string[] = (ROUTE_LEAVE.from(oldEl) as string[] | undefined)
          ?? (ROUTE_LEAVE.from(Object.getPrototypeOf(oldEl) as object) as string[] | undefined) ?? [];
        for (const key of handlers) {
          (oldEl as unknown as Record<string, Function | undefined>)[key]?.();
        }
      }
    }

    this._current = {
      path,
      params: match?.params ?? {},
      tag: newTag,
      meta: match?.entry.meta ?? {},
    };

    bus.emit(new RouteChanged(path, this._current.params, previous, this._current.meta));

    // Call @onRouteEnter on the new element (after DOM update via microtask).
    // Fires when the tag changed (new component) OR the path changed
    // (same component, different params — e.g. /creator/alice → /creator/bob).
    if ((tagChanged || pathChanged) && newTag && this._outlet) {
      queueMicrotask(() => {
        const newEl = this._outlet?.shadowRoot?.querySelector(newTag)
          ?? this._outlet?.querySelector(newTag);
        if (newEl) {
          const handlers: string[] = (ROUTE_ENTER.from(newEl) as string[] | undefined)
            ?? (ROUTE_ENTER.from(Object.getPrototypeOf(newEl) as object) as string[] | undefined) ?? [];
          for (const key of handlers) {
            (newEl as unknown as Record<string, Function | undefined>)[key]?.(this._current.params, this._current.meta);
          }
        }
      });
    }

    this._previousTag = newTag;
  }

  /**
   * Run guards for the target route.
   *
   * Checks named guards from @route({ guards: [...] }) first,
   * then falls back to @guard methods on the component prototype.
   * Resolves @inject params on guard methods from the DI container.
   */
  private async _checkGuards(path: string): Promise<boolean | string> {
    const match = matchRoute(path);
    if (!match) return true; // No route = no guards

    // Collect guards to run: named guards from route entry + prototype guards
    const namedGuards = match.entry.guards ?? [];
    const protoGuards: string[] = match.entry.ctor.prototype?.[GUARD_HANDLERS] ?? [];

    // No guards at all = allow
    if (namedGuards.length === 0 && protoGuards.length === 0) return true;

    // Build RouteInfo — passed as arg 0 to every guard
    const routeInfo: RouteInfo = {
      path,
      params: match.params,
      tag: match.entry.tag,
      meta: match.entry.meta,
    };

    // 1. Run named guards from the global registry
    for (const guardName of namedGuards) {
      const reg = guardRegistry.get(guardName);
      if (!reg) {
        console.warn(`[LoomRouter] Guard "${guardName}" not found in registry`);
        continue;
      }

      const args = this._resolveGuardInjectParams(reg.method, reg.key);
      const result = await reg.method.apply(null, [routeInfo, ...args]);
      if (result instanceof LoomResult) {
        if (!result.ok) return result.error as string ?? false;
        continue;
      }
      if (result === false) return false;
      if (typeof result === "string") return result;
    }

    // 2. Run legacy @guard methods on the component prototype
    const proto = match.entry.ctor.prototype;
    for (const key of protoGuards) {
      // Skip if already run as a named guard
      if (namedGuards.some((n) => guardRegistry.get(n)?.key === key)) continue;

      const args = this._resolveGuardInjectParams(proto, key);
      const result = await proto[key].apply(proto, [routeInfo, ...args]);
      if (result instanceof LoomResult) {
        if (!result.ok) return result.error as string ?? false;
        continue;
      }
      if (result === false) return false;
      if (typeof result === "string") return result;
    }

    return true;
  }

  /**
   * Resolve @inject parameters for a method.
   * Uses the same INJECT_PARAMS metadata as @factory.
   */
  private _resolveInjectParams(proto: object, method: string): unknown[] {
    const injectMeta: Array<{ method: string; index: number; key: new (...args: unknown[]) => unknown }> =
      (INJECT_PARAMS.from(proto) as Array<{ method: string; index: number; key: new (...args: unknown[]) => unknown }>) ?? [];
    const methodParams = injectMeta
      .filter((m) => m.method === method)
      .sort((a, b) => a.index - b.index);

    if (methodParams.length === 0) return [];

    const args: unknown[] = [];
    for (const param of methodParams) {
      args[param.index] = app.get(param.key);
    }
    return args;
  }

  /**
   * Resolve @inject parameters for a guard method.
   *
   * Guards receive `RouteInfo` as arg 0 (prepended by _checkGuards),
   * so @inject indices are offset by −1 to build a clean args array
   * that gets spread *after* routeInfo.
   */
  private _resolveGuardInjectParams(proto: object, method: string): unknown[] {
    const injectMeta: Array<{ method: string; index: number; key: new (...args: unknown[]) => unknown }> =
      (INJECT_PARAMS.from(proto) as Array<{ method: string; index: number; key: new (...args: unknown[]) => unknown }>) ?? [];
    const methodParams = injectMeta
      .filter((m) => m.method === method)
      .sort((a, b) => a.index - b.index);

    if (methodParams.length === 0) return [];

    const args: unknown[] = [];
    for (const param of methodParams) {
      // index 0 = routeInfo (prepended), so @inject index N maps to args[N-1]
      const adjusted = param.index > 0 ? param.index - 1 : 0;
      args[adjusted] = app.get(param.key);
    }
    return args;
  }
}
