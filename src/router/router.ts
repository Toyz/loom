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

export class LoomRouter {
  readonly mode: RouterMode;
  private _current: RouteInfo = { path: "/", params: {}, tag: null, meta: {} };
  private _previousTag: string | null = null;
  /** Optional outlet reference for lifecycle dispatch */
  private _outlet: HTMLElement | null = null;

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
  start(): () => void {
    const cleanup = this.mode.listen(() => this._resolve());
    this._resolve();
    return cleanup;
  }

  /** Navigate to a path or named route */
  async go(target: RouteTarget): Promise<void> {
    const path = this._resolvePath(target);
    const allowed = await this._checkGuards(path);
    if (allowed === false) return;
    if (typeof allowed === "string") {
      return this.go(allowed);
    }
    this.mode.write(path);
    this._resolve();
  }

  /** Alias for go() */
  navigate(target: RouteTarget): Promise<void> {
    return this.go(target);
  }

  /** Navigate without creating a history entry */
  async replace(target: RouteTarget): Promise<void> {
    const path = this._resolvePath(target);
    const allowed = await this._checkGuards(path);
    if (allowed === false) return;
    if (typeof allowed === "string") {
      return this.replace(allowed);
    }
    this.mode.replace(path);
    this._resolve();
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
    if (typeof target === "string") return target;
    return buildPath(target.name, target.params);
  }

  /** Resolve the current URL against the route table and emit RouteChanged */
  private _resolve(): void {
    const path = this.mode.read();
    const match = matchRoute(path);
    const previous = this._current.path;
    const newTag = match?.entry.tag ?? null;

    // ── Route lifecycle hooks ──
    const tagChanged = this._previousTag !== newTag;

    // Call @onRouteLeave on the old element
    if (tagChanged && this._previousTag && this._outlet) {
      const oldEl = this._outlet.shadowRoot?.querySelector(this._previousTag)
        ?? this._outlet.querySelector(this._previousTag);
      if (oldEl) {
        const handlers: string[] = (oldEl as any)[ROUTE_LEAVE.key]
          ?? Object.getPrototypeOf(oldEl)?.[ROUTE_LEAVE.key] ?? [];
        for (const key of handlers) {
          (oldEl as any)[key]?.();
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

    // Call @onRouteEnter on the new element (after DOM update via microtask)
    if (tagChanged && newTag && this._outlet) {
      queueMicrotask(() => {
        const newEl = this._outlet?.shadowRoot?.querySelector(newTag)
          ?? this._outlet?.querySelector(newTag);
        if (newEl) {
          const handlers: string[] = (newEl as any)[ROUTE_ENTER.key]
            ?? Object.getPrototypeOf(newEl)?.[ROUTE_ENTER.key] ?? [];
          for (const key of handlers) {
            (newEl as any)[key]?.(this._current.params, this._current.meta);
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

    // 1. Run named guards from the global registry
    for (const guardName of namedGuards) {
      const reg = guardRegistry.get(guardName);
      if (!reg) {
        console.warn(`[LoomRouter] Guard "${guardName}" not found in registry`);
        continue;
      }

      const args = this._resolveInjectParams(reg.method, reg.key);
      const result = await reg.method.apply(null, args);
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

      const args = this._resolveInjectParams(proto, key);
      const result = await proto[key].apply(proto, args);
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
  private _resolveInjectParams(proto: any, method: string): any[] {
    const injectMeta: Array<{ method: string; index: number; key: any }> =
      proto[INJECT_PARAMS.key] ?? [];
    const methodParams = injectMeta
      .filter((m) => m.method === method)
      .sort((a, b) => a.index - b.index);

    if (methodParams.length === 0) return [];

    const args: any[] = [];
    for (const param of methodParams) {
      args[param.index] = app.get(param.key);
    }
    return args;
  }
}
