/**
 * Loom Router — <loom-outlet>
 *
 * Renders the component matched by the current route.
 * Supports `inherit-styles` attribute to pass parent stylesheets
 * into the routed component's shadow root.
 *
 * Resolves the initial route on connect so pages render even if
 * RouteChanged fired before the outlet entered the DOM.
 */

import { LoomElement, type Schedulable } from "../element/element";
import { component } from "../element/decorators";
import { on } from "../decorators/events";
import { prop } from "../store/decorators";
import { ROUTE_PROPS, TRANSFORMS } from "../decorators/symbols";
import { matchRoute } from "./route";
import { RouteChanged } from "./events";
import { params as paramsSentinel, routeQuery as querySentinel, routeMeta as metaSentinel } from "../store/decorators";
import { app } from "../app";
import { LoomRouter } from "./router";

@component("loom-outlet")
class LoomOutlet extends LoomElement {
  /** Stylesheets to pass down to routed components via adoptStyles() */
  @prop accessor styles: CSSStyleSheet[] = [];
  @prop accessor scrollToTop = true;

  /** Optional callback invoked with the routed element after mount */
  routeMount: ((el: HTMLElement) => void) | null = null;

  private _currentTag: string | null = null;
  private _currentEl: HTMLElement | null = null;
  private _initialResolved = false;

  @on(RouteChanged)
  onRouteChanged(e: RouteChanged) {
    this._show(e.path, e.params, e.meta);
  }

  /**
   * Called after the first render — resolve whatever the current URL is.
   *
   * This used to call matchRoute() + _show() directly, bypassing every guard.
   * The router's own resolution is async, so on a cold load the outlet always
   * won the race and mounted guarded components (running their @mount hooks
   * and fetches) before the guard could deny them. Delegate to the router
   * instead; only the no-router fallback still matches directly.
   */
  firstUpdated() {
    if (this._initialResolved) return;
    this._initialResolved = true;

    const found = app.maybe<LoomRouter>(LoomRouter);
    const router = found.ok ? found.value : undefined;
    if (router) {
      // Registering here is what finally makes @onRouteEnter/@onRouteLeave fire.
      router.setOutlet(this);
      this.track(() => router.clearOutlet(this));

      const cur = router.current;
      if (cur.tag) {
        // Already guard-checked by the router — safe to mount.
        this._show(cur.path, cur.params, cur.meta);
      } else {
        // Not resolved yet: run the guard pipeline rather than pre-empting it.
        void router.refresh();
      }
      return;
    }

    // No router registered — keep the standalone behavior.
    let path = location.hash.slice(1) || location.pathname || "/";
    const qIdx = path.indexOf("?");
    if (qIdx !== -1) path = path.slice(0, qIdx);
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (!path.startsWith("/")) path = "/" + path;

    const match = matchRoute(path);
    if (match) {
      this._show(path, match.params, match.entry.meta);
    }
  }

  private _show(path: string, params: Record<string, string>, meta: Record<string, unknown> = {}): void {
    const match = matchRoute(path);
    const tag = match?.entry.tag ?? null;

    if (!tag) {
      this._clear();
      return;
    }

    // Same component — update data and force re-render
    if (tag === this._currentTag && this._currentEl) {
      this._injectRouteData(this._currentEl, params, meta);
      // Force update — route data changed but reactive setters may not
      // have fired (e.g. unbound params set via setAttribute, or
      // components that rely on @onRouteEnter to read params).
      (this._currentEl as unknown as Schedulable).scheduleUpdate?.(true);
      return;
    }

    this._clear();
    this._mount(tag, params, meta);
    if (this.scrollToTop) this._scrollToTop();
  }

  private _mount(tag: string, params: Record<string, string>, meta: Record<string, unknown> = {}): void {
    const el = document.createElement(tag);
    this._injectRouteData(el, params, meta);

    // Pass explicit styles to the routed component
    if (this.styles.length > 0) {
      this._adoptParentStyles(el);
    }

    this.shadow.appendChild(el);
    this._currentTag = tag;
    this._currentEl = el;

    // Notify consumer
    if (this.routeMount) {
      queueMicrotask(() => this.routeMount?.(el));
    }
  }

  /**
   * Inject route params, query params, and meta into the element.
   * Uses ROUTE_PROPS metadata when available (typed properties),
   * falls back to setAttribute for backward compat.
   */
  private _injectRouteData(el: HTMLElement, params: Record<string, string>, meta: Record<string, unknown> = {}): void {
    const ctor = el.constructor as object;
    const routeBindings = (ROUTE_PROPS.from(ctor) ?? []) as Array<{ propKey: string; param?: string; params?: symbol; query?: string | symbol; meta?: string | symbol }>;
    const transforms = TRANSFORMS.from(ctor) as Map<string, Function> | undefined;
    const queryMap = this._parseQuery();
    const boundParamKeys = new Set<string>();

    // Per-element snapshot of the declared defaults, captured before the first
    // injection. An absent param/query used to be substituted with "", which
    // the coercion below then turned into 0 for a numeric prop — so
    // `@prop({ query: "page" }) accessor page = 1` became 0 on any URL without
    // ?page=, instead of staying 1.
    const defaults = this._routeDefaults(el, routeBindings);

    for (const binding of routeBindings) {
      let value: unknown;

      if (binding.params === paramsSentinel) {
        // Full param decompose: @prop({params})
        value = { ...params };
      } else if (typeof binding.param === "string") {
        // Single param pick: @prop({ param: "id" })
        boundParamKeys.add(binding.param);
        if (!(binding.param in params)) {
          (el as unknown as Record<string, unknown>)[binding.propKey] = defaults[binding.propKey];
          continue;
        }
        value = params[binding.param];
      } else if (binding.query === querySentinel) {
        // Full query decompose: @prop({query: routeQuery})
        value = Object.fromEntries(queryMap);
      } else if (typeof binding.query === "string") {
        // Single query pick: @prop({ query: "tab" })
        if (!queryMap.has(binding.query)) {
          (el as unknown as Record<string, unknown>)[binding.propKey] = defaults[binding.propKey];
          continue;
        }
        value = queryMap.get(binding.query);
      } else if (binding.meta === metaSentinel) {
        // Full meta decompose: @prop({meta: routeMeta})
        value = { ...meta };
      } else if (typeof binding.meta === "string") {
        // Single meta pick: @prop({ meta: "layout" })
        value = meta[binding.meta];
      }

      // Apply @transform if registered
      if (transforms?.has(binding.propKey) && value !== undefined) {
        value = transforms.get(binding.propKey)!(value);
      } else if (typeof value === "string") {
        // Auto-coerce string → number/boolean based on current property type
        // (same logic as attributeChangedCallback in @component)
        const current = (el as unknown as Record<string, unknown>)[binding.propKey];
        if (typeof current === "number") value = Number(value);
        else if (typeof current === "boolean") value = value !== "false";
      }

      (el as unknown as Record<string, unknown>)[binding.propKey] = value;
    }

    // Backward compat: set unbound params as attributes
    for (const [key, val] of Object.entries(params)) {
      if (!boundParamKeys.has(key)) {
        el.setAttribute(key, val);
      }
    }
  }

  /**
   * Snapshot each route-bound prop's declared default, once per element.
   *
   * Taken on the first injection, before anything has been written, so a later
   * navigation that omits a param can restore the initializer value rather
   * than blanking the prop.
   */
  private _routeDefaults(
    el: HTMLElement,
    bindings: Array<{ propKey: string }>,
  ): Record<string, unknown> {
    const host = el as unknown as { __loomRouteDefaults?: Record<string, unknown> };
    let defaults = host.__loomRouteDefaults;
    if (!defaults) {
      defaults = Object.create(null) as Record<string, unknown>;
      for (const b of bindings) {
        defaults[b.propKey] = (el as unknown as Record<string, unknown>)[b.propKey];
      }
      host.__loomRouteDefaults = defaults;
    }
    return defaults;
  }

  /** Parse query params from the URL (supports both hash and history mode) */
  private _parseQuery(): URLSearchParams {
    const hash = location.hash;
    const hashQ = hash.indexOf("?");
    // Hash mode: query is inside the hash fragment
    if (hashQ >= 0) return new URLSearchParams(hash.slice(hashQ + 1));
    // History mode: query is in location.search
    return new URLSearchParams(location.search);
  }

  private _adoptParentStyles(el: HTMLElement): void {
    const loomEl = el as unknown as { adoptStyles?: (styles: CSSStyleSheet[]) => void };
    if (typeof loomEl.adoptStyles === "function") {
      loomEl.adoptStyles(this.styles);
    }
  }

  private _clear(): void {
    if (this._currentEl) {
      this._currentEl.remove();
      this._currentEl = null;
      this._currentTag = null;
    }
  }

  private _scrollToTop(): void {
    // Walk up the DOM tree (including shadow host boundaries)
    let node: Node | null = this;
    while (node) {
      if (node instanceof Element && node.scrollTop > 0) {
        node.scrollTop = 0;
      }
      // Cross shadow DOM boundary
      const root = node.getRootNode();
      if (root instanceof ShadowRoot) {
        node = root.host;
      } else {
        node = (node as Element).parentElement;
      }
    }
    // Always scroll the window as failsafe
    window.scrollTo(0, 0);
  }
}

export { LoomOutlet };
