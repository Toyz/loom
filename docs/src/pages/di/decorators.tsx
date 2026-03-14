/**
 * DI — Decorators  /di/decorators
 *
 * @service, @inject, @maybe, @factory reference page.
 */
import { LoomElement } from "@toyz/loom";

export default class PageDIDecorators extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Decorators" subtitle="DI-specific decorators for services, injection, optional injection, and provider factories."></doc-header>

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
              Dual-mode dependency injection. Use as a <strong>property decorator</strong> for
              a lazy getter, or as a <strong>parameter decorator</strong> on constructors and
              factory methods.
            </div>
            <code-block lang="ts" code={`import { inject } from "@toyz/loom";

// Auto-accessor — lazy getter (throws if missing)
@inject(AuthService) accessor auth!: AuthService;

// String key (minification-safe)
@inject("AuthService") accessor auth!: AuthService;

// In a component
@component("user-profile")
class UserProfile extends LoomElement {
  @inject(AuthService) accessor auth!: AuthService;

  update() {
    return <p>Logged in as {this.auth.currentUser.name}</p>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="help-circle" size={20} color="var(--emerald)"></loom-icon>
            <h2>@maybe</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@maybe(Key)</div>
            <div class="dec-desc">
              Optional dependency injection. Returns <span class="ic">undefined</span> if the
              provider is not registered, instead of throwing. Use when a dependency
              is genuinely optional.
            </div>
            <code-block lang="ts" code={`import { maybe } from "@toyz/loom";

@component("analytics-tracker")
class AnalyticsTracker extends LoomElement {
  // Won't throw if AnalyticsService isn't registered
  @maybe(AnalyticsService) accessor analytics?: AnalyticsService;

  track(event: string) {
    // Only tracks if the service is available
    this.analytics?.track(event);
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
              Method decorator on <span class="ic">@service</span> classes.
              The return value is registered as a provider on <span class="ic">app.start()</span>.
              Supports <span class="ic">@inject</span> on parameters. Async methods are awaited.
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
            <loom-icon name="eye" size={20} color="var(--cyan)"></loom-icon>
            <h2>@watch(Service) <span class="badge deprecated">unified</span></h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@watch(ServiceClass, prop?)</div>
            <div class="dec-desc">
              Subscribe a component method to changes on a DI-resolved service.
              This is now part of the unified <span class="ic">@watch</span> decorator —
              it detects whether you pass a string (local field), a <span class="ic">Reactive</span> instance,
              or a <strong>class constructor</strong> (DI lookup) and does the right thing.
            </div>
            <code-block lang="ts" code={`import { watch } from "@toyz/loom";
import { TodoStore } from "./stores/todo-store";
import { ThemeService } from "./services/theme";

@component("todo-page")
class TodoPage extends LoomElement {
  items: Todo[] = [];
  theme = "dark";

  // Watch the service itself (must extend Reactive)
  @watch(TodoStore)
  onTodos(items: Todo[], prev: Todo[]) {
    this.items = items;
  }

  // Watch a specific reactive property on the service
  @watch(ThemeService, "theme")
  onTheme(val: string, prev: string) {
    this.theme = val;
  }

  update() {
    return <div class={this.theme}>{this.items.length} todos</div>;
  }
}`}></code-block>
          </div>
          <doc-notification type="note">
            <strong>Deprecation:</strong> The <span class="ic">watchService</span> export still works
            but is deprecated and will be removed in v1.0. Use <span class="ic">@watch(Service)</span> instead.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--emerald)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@service</code></td><td>Class</td><td>Auto-instantiated singleton, registered on <code>app.start()</code></td></tr>
              <tr><td><code>@inject(Key)</code></td><td>Accessor</td><td>Lazy getter — throws if not found</td></tr>
              <tr><td><code>@maybe(Key)</code></td><td>Accessor</td><td>Lazy getter — returns <code>undefined</code> if not found</td></tr>
              <tr><td><code>@factory(Key?)</code></td><td>Method</td><td>Return value registered as provider</td></tr>
              <tr><td><code>@watch(Svc, prop?)</code></td><td>Method</td><td>Subscribe to DI-resolved Reactive service changes</td></tr>
            </tbody>
          </table>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
