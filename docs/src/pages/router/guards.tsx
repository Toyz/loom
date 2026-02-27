/**
 * Router — Guards
 * /router/guards
 */
import { LoomElement } from "@toyz/loom";

export default class PageRouterGuards extends LoomElement {
  update() {
    return (
      <div>
        <h1>Route Guards</h1>
        <p class="subtitle">
          Protect routes with named, injectable guard functions.
        </p>

        <div class="note">
          <strong>🧭 See It Live</strong> — This docs site uses a <span class="ic">docs-log</span> guard
          on every section. Open <strong>DevTools → Console</strong> and click any nav link
          to watch it fire in real-time!
        </div>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--emerald)"></loom-icon>
            <h2>@guard</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@guard(name?)</div>
            <div class="dec-desc">
              Mark a method as a named route guard. Return <span class="ic">true</span> to allow,
              <span class="ic">false</span> to block, or a <span class="ic">string</span> to redirect.
              Async guards are awaited:
            </div>
            <code-block lang="ts" code={`import { service, inject } from "@toyz/loom";
import { guard, type RouteInfo } from "@toyz/loom/router";

@service
class Guards {
  @guard("auth")
  checkAuth(route: RouteInfo, @inject(AuthService) auth: AuthService) {
    return auth.isLoggedIn ? true : "/login";
  }

  @guard("admin")
  checkAdmin(route: RouteInfo, @inject(AuthService) auth: AuthService) {
    // Use route.meta to check role requirements set on the route
    const requiredRole = route.meta.role as string ?? "admin";
    return auth.role === requiredRole || "/403";
  }

  // Name derived from method name: "checkSubscription"
  @guard()
  checkSubscription(route: RouteInfo, @inject(BillingService) billing: BillingService) {
    return billing.isActive ? true : "/upgrade";
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="link" size={20} color="var(--accent)"></loom-icon>
            <h2>Connecting Guards to Routes</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Reference guards by name in the <span class="ic">@route</span> options.
              Guards run in order — if any guard rejects, navigation stops:
            </div>
            <code-block lang="ts" code={`@route("/admin", { guards: ["auth", "admin"] })
@component("page-admin")
class PageAdmin extends LoomElement { }

@route("/billing", { guards: ["auth", "checkSubscription"] })
@component("page-billing")
class PageBilling extends LoomElement { }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--amber)"></loom-icon>
            <h2>Guard Resolution</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">Guards are resolved in two phases:</div>
            <ol>
              <li>
                <strong>Global registry</strong> — guards registered via <span class="ic">@guard()</span> on
                <span class="ic">@service</span> classes are checked first.
                <span class="ic">@inject</span> parameters are resolved from the DI container.
              </li>
              <li>
                <strong>Component prototype</strong> — fallback: guard methods defined directly on the
                route component's prototype.
              </li>
            </ol>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--cyan)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@guard()</span> is a define-time decorator built on <span class="ic">createDecorator</span>.
              It registers the method in a global <span class="ic">guardRegistry</span> map keyed by name.
              When <span class="ic">@guard()</span> is called without a name, the method name is used.
            </div>
          </div>
        </section>
      </div>
    );
  }
}
