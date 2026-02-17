/**
 * Loom Router — <loom-link>
 *
 * Declarative navigation link. Renders an <a> that adapts
 * its href to the current router mode (hash vs history).
 * Adds `.active` class when the current route matches.
 */

import { LoomElement } from "../element";
import { component, prop, on, query } from "../decorators";
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

    // Build initial DOM
    const a = document.createElement("a");
    a.setAttribute("part", "anchor");
    const slot = document.createElement("slot");
    a.appendChild(slot);
    this.shadow.appendChild(a);

    this._sync();

    // Intercept clicks — use router.go() instead of native nav
    this.shadow.addEventListener("click", (e: Event) => {
      e.preventDefault();
      this.router.go(this._target());
    });
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

  private _sync(): void {
    const a = this.anchor;
    if (!a) return;
    const resolved = typeof this._target() === "string"
      ? this._target() as string
      : buildPath((this._target() as any).name, (this._target() as any).params);
    a.href = this.router.href(this._target());
    a.className = this.router.current.path === resolved ? "active" : "";
  }
}

export { LoomLink };
