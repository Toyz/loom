/**
 * Router — Guards
 * /router/guards
 */
import { LoomElement, component, mount } from "@toyz/loom";
import { docStyles } from "../../styles/doc-page";

export default class PageRouterGuards extends LoomElement {

  @mount
  setup() {}

  update() {
    return (
      <div>
        <h1>Route Guards</h1>
        <p class="subtitle">
          Protect routes with named, injectable guard functions.
        </p>

        <aside class="callout">
          <strong>🧭 See It Live</strong> — This docs site uses a <span class="ic">docs-log</span> guard
          on every section. Open <strong>DevTools → Console</strong> and click any nav link
          to watch it fire in real-time!
        </aside>

        <section>
          <h2>@guard(name?)</h2>
          <p>
            Mark a method as a named route guard. Return <span class="ic">true</span> to allow,
            <span class="ic">false</span> to block, or a <span class="ic">string</span> to redirect.
            Async guards are awaited:
          </p>
          <code-block lang="ts" code={`import { service, inject } from "@toyz/loom";
import { guard } from "@toyz/loom/router";

@service
class Guards {
  @guard("auth")
  checkAuth(@inject(AuthService) auth: AuthService) {
    return auth.isLoggedIn ? true : "/login";
  }

  @guard("admin")
  checkAdmin(@inject(AuthService) auth: AuthService) {
    return auth.role === "admin" || "/403";
  }

  // Name derived from method name: "checkSubscription"
  @guard()
  checkSubscription(@inject(BillingService) billing: BillingService) {
    return billing.isActive ? true : "/upgrade";
  }
}`}></code-block>
        </section>

        <section>
          <h2>Connecting Guards to Routes</h2>
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
          <h2>Guard Resolution</h2>
          <p>
            Guards are resolved in two phases:
          </p>
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
        </section>

        <section>
          <h2>How It Works</h2>
          <p>
            <span class="ic">@guard()</span> is a define-time decorator built on <span class="ic">createDecorator</span>.
            It registers the method in a global <span class="ic">guardRegistry</span> map keyed by name.
            When <span class="ic">@guard()</span> is called without a name, the method name is used.
          </p>
        </section>
      </div>
    );
  }
}
