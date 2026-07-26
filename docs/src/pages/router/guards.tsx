/**
 * Router — Guards
 * /router/guards
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterGuards extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Route Guards" subtitle="Protect routes with named, injectable guard functions."></doc-header>

        <section>
          <p>A guard is the only thing standing between a URL someone typed and a page they should not see. That makes its failure mode asymmetric: a guard that wrongly blocks is an annoyance you will hear about, and a guard that wrongly allows is a breach you will not.</p>
          <p>Loom guards run before the route renders, in registration order, and the first one to object stops the navigation. What "object" means depends on what you return, and the six possible answers are worth knowing exactly.</p>
          <punch-matrix
            columns="ALLOWS,BLOCKS,REDIRECTS"
            rows={[
              { name: "true", punches: "ALLOWS", note: "Navigation proceeds" },
              { name: "false", punches: "BLOCKS", note: "Navigation is abandoned where it stands" },
              { name: `"/login"`, punches: "REDIRECTS", note: "A string is treated as a destination" },
              { name: "ok(...)", punches: "ALLOWS", note: "Any successful LoomResult" },
              { name: `err("/login")`, punches: "REDIRECTS", note: "A string error is a destination" },
              { name: "err(new Error(...))", punches: "BLOCKS", note: "Changed in 0.22.0 — this used to allow" },
            ]}
          ></punch-matrix>
        </section>

        <doc-notification type="note">
          <strong>See it live</strong> — this site registers a <span class="ic">docs-log</span> guard
          on every section. Open the console and click any nav link to watch it fire.
        </doc-notification>

        <section>
          <div class="group-header">
            <h2>@guard</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@guard(name?)</div>
            <div class="dec-desc">
              Mark a method as a named route guard. Return <span class="ic">true</span> to allow,
              <span class="ic">false</span> to block, or a <span class="ic">string</span> to redirect.
              Async guards are awaited:
            </div>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { service } from "@toyz/loom/di";
import { guard, type RouteInfo } from "@toyz/loom/router";

@service
class Guards {
  // A guard receives exactly one argument, the RouteInfo, and runs with
  // "this" unbound -- resolve what you need from the container.
  @guard("auth")
  checkAuth(route: RouteInfo) {
    return app.get(AuthService).isLoggedIn ? true : "/login";
  }

  @guard("admin")
  checkAdmin(route: RouteInfo) {
    // route.meta carries whatever the @route declared
    const required = route.meta.role as string ?? "admin";
    return app.get(AuthService).role === required || "/403";
  }

  // Name derived from the method name: "checkSubscription"
  @guard()
  checkSubscription(route: RouteInfo) {
    return app.get(BillingService).isActive ? true : "/upgrade";
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <h2>Connecting Guards to Routes</h2>
          </div>
            <p>
              Reference guards by name in the <span class="ic">@route</span> options.
              Guards run in order — if any guard rejects, navigation stops:
            </p>
            <code-block lang="ts" code={`@route("/admin", { guards: ["auth", "admin"] })
@component("page-admin")
class PageAdmin extends LoomElement { }

@route("/billing", { guards: ["auth", "checkSubscription"] })
@component("page-billing")
class PageBilling extends LoomElement { }`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <h2>Guard Resolution</h2>
          </div>
            <p>Guards are resolved in two phases:</p>
            <ol>
              <li>
                <strong>Global registry</strong> — guards registered via <span class="ic">@guard()</span> on
                <span class="ic">@service</span> classes are checked first.
              </li>
              <li>
                <strong>Component prototype</strong> — fallback: guard methods defined directly on the
                route component's prototype.
              </li>
            </ol>
        </section>

        <section>
          <div class="group-header">
            <h2>How It Works</h2>
          </div>
            <p>
              <span class="ic">@guard()</span> is a define-time decorator built on <span class="ic">createDecorator</span>.
              It registers the method in a global <span class="ic">guardRegistry</span> map keyed by name.
              When <span class="ic">@guard()</span> is called without a name, the method name is used.
            </p>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
