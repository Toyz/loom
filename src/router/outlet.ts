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

import { LoomElement } from "../element/element";
import { component, on, prop, ROUTE_PROPS, TRANSFORMS } from "../decorators";
import { matchRoute } from "./route";
import { RouteChanged } from "./events";
import { params as paramsSentinel, routeQuery as querySentinel } from "../store/decorators";

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
    this._show(e.path, e.params);
  }

  /** Called after the first render — resolve whatever the current URL is */
  firstUpdated() {
    if (this._initialResolved) return;
    this._initialResolved = true;
    const path = location.hash.slice(1) || "/";
    const match = matchRoute(path);
    if (match) {
      this._show(path, match.params);
    }
  }

  private _show(path: string, params: Record<string, string>): void {
    const match = matchRoute(path);
    const tag = match?.entry.tag ?? null;

    if (!tag) {
      this._clear();
      return;
    }

    // Same component — just update data
    if (tag === this._currentTag && this._currentEl) {
      this._injectRouteData(this._currentEl, params);
      return;
    }

    this._clear();
    this._mount(tag, params);
    if (this.scrollToTop) this._scrollToTop();
  }

  private _mount(tag: string, params: Record<string, string>): void {
    const el = document.createElement(tag);
    this._injectRouteData(el, params);

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
   * Inject route params and query params into the element.
   * Uses ROUTE_PROPS metadata when available (typed properties),
   * falls back to setAttribute for backward compat.
   */
  private _injectRouteData(el: HTMLElement, params: Record<string, string>): void {
    const ctor = el.constructor as any;
    const routeBindings = ctor[ROUTE_PROPS] ?? [];
    const transforms = ctor[TRANSFORMS] as Map<string, Function> | undefined;
    const queryMap = this._parseQuery();
    const boundParamKeys = new Set<string>();

    for (const binding of routeBindings) {
      let value: any;

      if (binding.params === paramsSentinel) {
        // Full param decompose: @prop({params})
        value = { ...params };
      } else if (typeof binding.param === "string") {
        // Single param pick: @prop({ param: "id" })
        value = params[binding.param] ?? "";
        boundParamKeys.add(binding.param);
      } else if (binding.query === querySentinel) {
        // Full query decompose: @prop({query: routeQuery})
        value = Object.fromEntries(queryMap);
      } else if (typeof binding.query === "string") {
        // Single query pick: @prop({ query: "tab" })
        value = queryMap.get(binding.query) ?? "";
      }

      // Apply @transform if registered
      if (transforms?.has(binding.propKey) && value !== undefined) {
        value = transforms.get(binding.propKey)!(value);
      }

      (el as any)[binding.propKey] = value;
    }

    // Backward compat: set unbound params as attributes
    for (const [key, val] of Object.entries(params)) {
      if (!boundParamKeys.has(key)) {
        el.setAttribute(key, val);
      }
    }
  }

  /** Parse query params from the URL hash */
  private _parseQuery(): URLSearchParams {
    const hash = location.hash;
    const qIdx = hash.indexOf("?");
    return new URLSearchParams(qIdx >= 0 ? hash.slice(qIdx + 1) : "");
  }

  private _adoptParentStyles(el: HTMLElement): void {
    if (typeof (el as any).adoptStyles === "function") {
      (el as any).adoptStyles(this.styles);
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
