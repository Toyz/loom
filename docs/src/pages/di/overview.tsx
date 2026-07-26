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
          <p>The alternative to a container is a module-level <span class="ic">export const api = new ApiClient()</span>. That works until a test needs a different one, at which point every importer is holding the singleton directly and there is no seam to substitute at.</p>
          <p>A container is that seam. Services are registered by key and resolved on first use, so a test registers a fake before <span class="ic">start()</span> and every consumer gets it without knowing. Construction is lazy and singleton per container.</p>
        </section>

        <doc-section heading="LoomApp">
            <p>
              The <span class="ic">app</span> singleton is Loom's service container. It manages providers,
              delegates events, and boots the application.
            </p>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";

app.start(); // boots the app`}></code-block>
        </doc-section>
        <doc-section heading="Registering Providers">
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
              <tr><td><span class="ic">app.use(Class)</span></td><td>Instantiates once, keyed by constructor</td></tr>
              <tr><td><span class="ic">app.use(key, value)</span></td><td>Stores value under explicit key</td></tr>
              <tr><td><span class="ic">app.use(instance)</span></td><td>Stores instance, keyed by its constructor</td></tr>
              <tr><td><span class="ic">app.use(factory)</span></td><td>Calls factory, stores result</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-section heading="Retrieving Services">
            <code-block lang="ts" code={`// Get (throws if not registered)
const auth = app.get(AuthService);

// Maybe (returns undefined if not registered)
const db = app.maybe(DatabasePool);`}></code-block>
        </doc-section>
        <doc-section heading="@service">
          <api-entry sig="@service">
            <p>
              Auto-instantiated singleton registered on <span class="ic">app.start()</span>.
              Constructor <span class="ic">@inject</span> params are resolved automatically.
            </p>
            <code-block lang="ts" code={`import { service } from "@toyz/loom/di";

@service
class BookmarkStore extends CollectionStore<Bookmark> {
  constructor() {
    super("bookmarks", new LocalMedium("bookmarks"));
  }
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="@inject">
          <api-entry sig="@inject(Key)">
            <p>
              Dependency injection — use as a property decorator (lazy getter) or parameter
              decorator on constructors and factory methods.
            </p>
            <code-block lang="ts" code={`// Property — lazy getter
@inject(AuthService) auth!: AuthService;

// Constructor parameter
// resolve in the constructor body: app.get(Config)

// In a component
@component("user-profile")
class UserProfile extends LoomElement {
  @inject(AuthService) auth!: AuthService;
  @inject(NotificationService) notify!: NotificationService;

  update() {
    return <p>Logged in as {this.auth.currentUser.name}</p>;
  }
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="@factory">
          <api-entry sig="@factory(Key?)">
            <p>
              Method decorator on <span class="ic">@service</span> classes. Return value is registered
              as a provider on <span class="ic">app.start()</span>. Supports <span class="ic">@inject</span> on parameters.
            </p>
            <code-block lang="ts" code={`@service
class Boot {
  @factory(ChatClient)
  createChat() {
    const nc = app.get(NatsConn);
    return new ChatClient(nc);
  }
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="LoomLifecycle">
          <api-entry sig={`LoomLifecycle<"start" | "stop" | "suspend" | "resume">`}>
            <p>
              Services that implement <span class="ic">LoomLifecycle</span> have their <span class="ic">start()</span> / <span class="ic">stop()</span> methods called
              automatically by <span class="ic">app.start()</span> / <span class="ic">app.stop()</span>,
              and <span class="ic">suspend()</span> / <span class="ic">resume()</span> fired
              automatically on <span class="ic">visibilitychange</span> (tab hidden / visible).
            </p>
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
              The generic parameter enforces which hooks are declared. Hooks not in <span class="ic">T</span> become <span class="ic">never</span> — calling them is a
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
              <span class="ic">LoomRouter</span> implements {'LoomLifecycle<"start" | "stop">'}
               — registering it via <span class="ic">app.use(router)</span> is enough.
              The explicit <span class="ic">router.start()</span> call in <span class="ic">main.ts</span> is no longer needed.
            </div>
            <code-block lang="ts" code={`// Before
app.use(new LoomRouter({ mode: "history" }));
app.start();
router.start(); // ← no longer needed

// After
app.use(new LoomRouter({ mode: "history" }));
app.start(); // router.start() called automatically`}></code-block>
          </api-entry>
          <table class="api-table">
            <thead><tr><th>Hook</th><th>Called by</th><th>Order</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">start()</span></td><td><span class="ic">app.start()</span></td><td>Registration order</td></tr>
              <tr><td><span class="ic">stop()</span></td><td><span class="ic">app.stop()</span></td><td>Reverse registration order</td></tr>
              <tr><td><span class="ic">suspend()</span></td><td><span class="ic">visibilitychange</span> (hidden)</td><td>Registration order</td></tr>
              <tr><td><span class="ic">resume()</span></td><td><span class="ic">visibilitychange</span> (visible)</td><td>Registration order</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>

      </div>
    );
  }
}
