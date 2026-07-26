/**
 * Loom Router — <loom-link>
 *
 * Declarative navigation link. Renders an <a> that adapts
 * its href to the current router mode (hash vs history).
 * Adds `.active` class when the current route matches.
 *
 * Consumer CSS overrides:
 *   const inline = css`a { display: inline; }`;
 *   <loom-link to="/foo" styles={[inline]}>Foo</loom-link>
 */

import { LoomElement } from "../element/element";
import { component, query } from "../element/decorators";
import { prop } from "../store/decorators";
import { on } from "../decorators/events";
import { watch } from "../store/watch";
import { app } from "../app";
import { LoomRouter, type RouteTarget } from "./router";
import { RouteChanged } from "./events";
import { buildPath } from "./route";

@component("loom-link")
class LoomLink extends LoomElement {
  @prop accessor to = "/";
  /** Named route — when set, overrides `to` with the resolved path */
  @prop accessor name = "";
  /** Params for named route substitution (JSON string or object via JSX) */
  @prop accessor params = "";
  /** Optional CSSStyleSheets to adopt — overrides default anchor styles */
  @prop accessor styles: CSSStyleSheet[] = [];

  @query("a") accessor anchor!: HTMLAnchorElement;

  private get router(): LoomRouter {
    return app.get(LoomRouter);
  }

  connectedCallback() {
    super.connectedCallback();

    this.css`
      :host { display: contents; }
      a {
        color: inherit;
        text-decoration: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: inherit;
      }
    `;

    // Adopt consumer style overrides
    if (this.styles.length) {
      this.shadow.adoptedStyleSheets = [
        ...this.shadow.adoptedStyleSheets,
        ...this.styles,
      ];
    }

    // Build initial DOM — guarded, because connectedCallback runs again every
    // time the element is moved in the DOM. Without this a reconnect appended
    // a SECOND <a> (and @query("a") keeps syncing the first, so the visible
    // one kept a stale href).
    if (!this.shadow.querySelector("a")) {
      const a = document.createElement("a");
      a.setAttribute("part", "anchor");
      const slot = document.createElement("slot");
      a.appendChild(slot);
      this.shadow.appendChild(a);
    }

    this._sync();

    // Intercept clicks — use router.go() instead of native nav
    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      if (me.defaultPrevented) return;
      // Let the browser handle modifier and non-primary clicks, so
      // cmd/ctrl-click still opens a new tab and middle-click still works.
      if (me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
      e.preventDefault();
      this.router.go(this._target());
    };
    this.shadow.addEventListener("click", onClick);
    // Tracked, so disconnect removes it — otherwise a moved link accumulated
    // one handler per reconnect and router.go() fired N times per click.
    this.track(() => this.shadow.removeEventListener("click", onClick));
  }

  /** Build a RouteTarget from current props */
  private _target(): RouteTarget {
    if (this.name) {
      const p = typeof this.params === "string" && this.params
        ? JSON.parse(this.params)
        : (this.params || {});
      return { name: this.name, params: p };
    }
    return this.to;
  }

  @on(RouteChanged)
  private _onRouteChanged() {
    this._sync();
  }

  // The href and .active class used to be refreshed only on connect and on
  // RouteChanged, so `<loom-link to={this.nextPage}>` kept pointing at the
  // original path after nextPage changed.
  @watch("to")
  @watch("name")
  @watch("params")
  private _onTargetChanged() {
    this._sync();
  }

  private _sync(): void {
    const a = this.anchor;
    if (!a) return;
    // Resolve ONCE. This used to call _target() five times, re-running
    // JSON.parse(this.params) on each.
    let target: RouteTarget;
    let resolved: string;
    try {
      target = this._target();
      resolved = typeof target === "string"
        ? target
        : buildPath(target.name, target.params);
    } catch (e) {
      // buildPath throws on an unknown route name or missing param, and
      // malformed `params` JSON throws in _target(). EventBus.emit does not
      // guard its handlers, so throwing here from the RouteChanged listener
      // aborted every later subscriber — including the outlet's re-render.
      console.error("[Loom] <loom-link> could not resolve its target", e);
      return;
    }
    a.href = this.router.href(target);
    a.className = this.router.current.path === resolved ? "active" : "";
  }
}

export { LoomLink };
