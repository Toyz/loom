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
        <doc-header title="DI &amp; Services" subtitle="Service container, singleton management, and provider patterns."></doc-header>

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
            <code-block lang="ts" code={`import { service } from "@toyz/loom/di";

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

        <section>
          <div class="group-header">
            <loom-icon name="activity" size={20} color="var(--emerald)"></loom-icon>
            <h2>LoomLifecycle</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">{'LoomLifecycle<"start" | "stop" | "suspend" | "resume">'}</div>
            <div class="dec-desc">
              Services that implement <span class="ic">LoomLifecycle</span> have their{" "}
              <span class="ic">start()</span> / <span class="ic">stop()</span> methods called
              automatically by <span class="ic">app.start()</span> / <span class="ic">app.stop()</span>,
              and <span class="ic">suspend()</span> / <span class="ic">resume()</span> fired
              automatically on <span class="ic">visibilitychange</span> (tab hidden / visible).
            </div>
            <code-block lang="ts" code={`import type { LoomLifecycle } from "@toyz/loom";

@service("ws")
class WebSocketService implements LoomLifecycle<"start" | "stop" | "suspend" | "resume"> {
  private ws!: WebSocket;

  start()   { this.ws = new WebSocket("/ws"); }
  stop()    { this.ws.close(); }
  suspend() { this.ws.close(); }        // tab hidden
  resume()  { this.ws = new WebSocket("/ws"); } // tab visible
}`}></code-block>
            <div class="dec-desc" style="margin-top: 1rem;">
              The generic parameter enforces which hooks are declared. Hooks not in{" "}
              <span class="ic">T</span> become <span class="ic">never</span> — calling them is a
              compile-time error.
            </div>
            <code-block lang="ts" code={`// Only declares "start" — stop() does not exist in the type
@service
class AnalyticsService implements LoomLifecycle<"start"> {
  start() { this.track("app_boot"); }
}

// Async start() is awaited before app.start() continues
@service
class DatabaseService implements LoomLifecycle<"start" | "stop"> {
  async start() {
    await this.pool.connect();
  }
  stop() {
    this.pool.end();
  }
}`}></code-block>
            <div class="dec-desc" style="margin-top: 1rem;">
              <span class="ic">LoomRouter</span> implements{" "}
              {'LoomLifecycle<"start" | "stop">'}
              {" "}— registering it via <span class="ic">app.use(router)</span> is enough.
              The explicit <span class="ic">router.start()</span> call in <span class="ic">main.ts</span> is no longer needed.
            </div>
            <code-block lang="ts" code={`// Before
app.use(new LoomRouter({ mode: "history" }));
app.start();
router.start(); // ← no longer needed

// After
app.use(new LoomRouter({ mode: "history" }));
app.start(); // router.start() called automatically`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Hook</th><th>Called by</th><th>Order</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">start()</span></td><td><span class="ic">app.start()</span></td><td>Registration order</td></tr>
              <tr><td><span class="ic">stop()</span></td><td><span class="ic">app.stop()</span></td><td>Reverse registration order</td></tr>
              <tr><td><span class="ic">suspend()</span></td><td><span class="ic">visibilitychange</span> (hidden)</td><td>Registration order</td></tr>
              <tr><td><span class="ic">resume()</span></td><td><span class="ic">visibilitychange</span> (visible)</td><td>Registration order</td></tr>
            </tbody>
          </table>
        </section>
        <doc-nav></doc-nav>

      </div>
    );
  }
}
