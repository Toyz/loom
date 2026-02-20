/**
 * DI & Services Overview — /di/overview
 *
 * LoomApp container, @service, @inject, @factory.
 */
import { LoomElement } from "@toyz/loom";

export default class PageDIOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>DI &amp; Services</h1>
        <p class="subtitle">Service container, singleton management, and provider patterns.</p>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--emerald)"></loom-icon>
            <h2>LoomApp</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">app</span> singleton is Loom's service container. It manages providers,
              delegates events, and boots the application.
            </div>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";

app.start(); // boots the app`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>Registering Providers</h2>
          </div>
          <div class="feature-entry">
            <code-block lang="ts" code={`import { app } from "@toyz/loom";

// Class → auto-instantiated as singleton
app.use(AuthService);

// Explicit key + instance
app.use("API_URL", "https://api.example.com");

// Factory function
app.use(() => new DatabasePool({ max: 10 }));`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Pattern</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">app.use(Class)</span></td><td>Instantiates once, keyed by constructor</td></tr>
              <tr><td><span class="ic">app.use(key, value)</span></td><td>Stores value under explicit key</td></tr>
              <tr><td><span class="ic">app.use(instance)</span></td><td>Stores instance, keyed by its constructor</td></tr>
              <tr><td><span class="ic">app.use(factory)</span></td><td>Calls factory, stores result</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="search" size={20} color="var(--cyan)"></loom-icon>
            <h2>Retrieving Services</h2>
          </div>
          <div class="feature-entry">
            <code-block lang="ts" code={`// Get (throws if not registered)
const auth = app.get(AuthService);

// Maybe (returns undefined if not registered)
const db = app.maybe(DatabasePool);`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--amber)"></loom-icon>
            <h2>@service</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@service</div>
            <div class="dec-desc">
              Auto-instantiated singleton registered on <span class="ic">app.start()</span>.
              Constructor <span class="ic">@inject</span> params are resolved automatically.
            </div>
            <code-block lang="ts" code={`import { service } from "@toyz/loom";

@service
class BookmarkStore extends CollectionStore<Bookmark> {
  constructor() {
    super("bookmarks", new LocalMedium("bookmarks"));
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="link" size={20} color="var(--accent)"></loom-icon>
            <h2>@inject</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@inject(Key)</div>
            <div class="dec-desc">
              Dependency injection — use as a property decorator (lazy getter) or parameter
              decorator on constructors and factory methods.
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--rose)"></loom-icon>
            <h2>@factory</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@factory(Key?)</div>
            <div class="dec-desc">
              Method decorator on <span class="ic">@service</span> classes. Return value is registered
              as a provider on <span class="ic">app.start()</span>. Supports <span class="ic">@inject</span> on parameters.
            </div>
            <code-block lang="ts" code={`@service
class Boot {
  @factory(ChatClient)
  createChat(@inject(NatsConn) nc: NatsConn) {
    return new ChatClient(nc);
  }
}`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
