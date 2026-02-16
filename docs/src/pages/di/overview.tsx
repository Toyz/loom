/**
 * DI & Services Overview — /di/overview
 *
 * LoomApp container, @service, @inject, @factory.
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { DIGroup } from "../../groups";

@route("/overview", { group: DIGroup })
@component("page-di-overview")
export class PageDIOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>DI &amp; Services</h1>
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
          <h2>@service</h2>
          <p>
            Auto-instantiated singleton registered on <span class="ic">app.start()</span>.
            Constructor <span class="ic">@inject</span> params are resolved automatically.
          </p>
          <code-block lang="ts" code={`import { service } from "@toyz/loom";

@service
class BookmarkStore extends CollectionStore<Bookmark> {
  constructor() {
    super("bookmarks", new LocalMedium("bookmarks"));
  }
}`}></code-block>
        </section>

        <section>
          <h2>@inject</h2>
          <p>
            Dependency injection — use as a property decorator (lazy getter) or parameter
            decorator on constructors and factory methods.
          </p>
          <code-block lang="ts" code={`// Property — lazy getter
@inject(AuthService) auth!: AuthService;

// Constructor parameter
constructor(@inject(Config) cfg: Config) { ... }

// In a component
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
          <h2>@factory</h2>
          <p>
            Method decorator on <span class="ic">@service</span> classes. Return value is registered
            as a provider on <span class="ic">app.start()</span>. Supports <span class="ic">@inject</span> on parameters.
          </p>
          <code-block lang="ts" code={`@service
class Boot {
  @factory(ChatClient)
  createChat(@inject(NatsConn) nc: NatsConn) {
    return new ChatClient(nc);
  }
}`}></code-block>
        </section>
      </div>
    );
  }
}
