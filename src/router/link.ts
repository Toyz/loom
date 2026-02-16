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
import { LoomRouter } from "./router";
import { RouteChanged } from "./events";

@component("loom-link")
class LoomLink extends LoomElement {
  @prop to = "/";

  @query("a") private anchor!: HTMLAnchorElement;

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
      this.router.go(this.to);
    });
  }

  @on(RouteChanged)
  private _onRouteChanged() {
    this._sync();
  }

  private _sync(): void {
    const a = this.anchor;
    if (!a) return;
    a.href = this.router.href(this.to);
    a.className = this.router.current.path === this.to ? "active" : "";
  }
}

export { LoomLink };
