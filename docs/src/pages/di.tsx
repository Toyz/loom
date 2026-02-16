/**
 * App & DI — /features/di
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/features/di")
@component("page-di")
export class PageDI extends LoomElement {
  update() {
    return (
      <div>
        <h1>App &amp; Dependency Injection</h1>
        <p class="subtitle">Service container, singleton management, and provider patterns.</p>

        <section>
          <h2>LoomApp</h2>
          <p>
            The <span class="ic">app</span> singleton is Loom's service container. It manages providers,
            delegates events, and boots the application.
          </p>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";

app.start(); // boots the app`}></code-block>
        </section>

        <section>
          <h2>Registering Providers</h2>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";

// Class → auto-instantiated as singleton
app.use(AuthService);

// Explicit key + instance
app.use("API_URL", "https://api.example.com");

// Factory function
app.use(() => new DatabasePool({ max: 10 }));`}></code-block>

          <table class="api-table">
            <thead><tr><th>Pattern</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td><code>app.use(Class)</code></td><td>Instantiates once, keyed by constructor</td></tr>
              <tr><td><code>app.use(key, value)</code></td><td>Stores value under explicit key</td></tr>
              <tr><td><code>app.use(instance)</code></td><td>Stores instance, keyed by its constructor</td></tr>
              <tr><td><code>app.use(factory)</code></td><td>Calls factory, stores result</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Retrieving Services</h2>
          <code-block lang="ts" code={`// Get (throws if not registered)
const auth = app.get(AuthService);

// Maybe (returns undefined if not registered)
const db = app.maybe(DatabasePool);`}></code-block>
        </section>

        <section>
          <h2>@service Decorator</h2>
          <p>Automatically registers a class as a singleton when the module is imported:</p>
          <code-block lang="ts" code={`import { service } from "@toyz/loom";

@service
class NotificationService {
  send(msg: string) {
    console.log("Notify:", msg);
  }
}`}></code-block>
        </section>

        <section>
          <h2>@inject Decorator</h2>
          <p>Inject a dependency into a component or service:</p>
          <code-block lang="ts" code={`import { component, inject, LoomElement } from "@toyz/loom";

@component("user-profile")
class UserProfile extends LoomElement {
  @inject(AuthService) auth!: AuthService;
  @inject(NotificationService) notify!: NotificationService;

  update() {
    return <p>Logged in as {this.auth.currentUser.name}</p>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>@factory Decorator</h2>
          <p>Unlike <span class="ic">@service</span> (singleton), <span class="ic">@factory</span> creates a new instance each retrieval:</p>
          <code-block lang="ts" code={`import { factory } from "@toyz/loom";

@factory
class Logger {
  constructor(public prefix = "") {}
  log(msg: string) { console.log(\`[\${this.prefix}] \${msg}\`); }
}`}></code-block>
        </section>
      </div>
    );
  }
}
