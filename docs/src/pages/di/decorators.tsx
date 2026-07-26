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
          <p>Stage-3 decorators have no parameter form, so constructor injection in the shape other frameworks use is not available and never will be. Loom injects on property access instead, which turns out to be the better fit: resolution happens on first read, so a cyclic dependency resolves rather than deadlocking at construction.</p>
          <p>The four here differ in when they resolve and what happens when the key is missing. <span class="ic">@inject</span> throws on a missing provider; <span class="ic">@maybe</span> yields undefined. That distinction is the whole reason both exist.</p>
          <punch-matrix
            columns="REGISTERS,RESOLVES,THROWS IF MISSING,LAZY"
            rows={[
              { name: "@service", punches: "REGISTERS", note: "Singleton, constructed on app.start()" },
              { name: "@inject(Key)", punches: "RESOLVES,THROWS IF MISSING,LAZY", note: "Resolved on first read" },
              { name: "@maybe(Key)", punches: "RESOLVES,LAZY", note: "Yields undefined instead of throwing" },
              { name: "@factory(Key?)", punches: "REGISTERS", note: "The return value becomes the provider" },
              { name: "@watch(Service)", punches: "RESOLVES", note: "Subscribes to a resolved reactive service" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="@service">
          <api-entry sig="@service">
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
          </api-entry>
        </doc-section>
        <doc-section heading="@inject">
          <api-entry sig="@inject(Key)">
            <p>
              Resolves a provider on first read. It applies to an <span class="ic">accessor</span> —
              stage-3 decorators have no parameter form, so there is no constructor-parameter
              variant of this and never will be.
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="@maybe">
          <api-entry sig="@maybe(Key)">
            <p>
              Optional dependency injection. Returns <span class="ic">undefined</span> if the
              provider is not registered, instead of throwing. Use when a dependency
              is genuinely optional.
            </p>
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
          </api-entry>
        </doc-section>
        <doc-section heading="@factory">
          <api-entry sig="@factory(Key?)">
            <p>
              Method decorator on <span class="ic">@service</span> classes.
              The return value is registered as a provider on <span class="ic">app.start()</span>.
              Async methods are awaited. Resolve what the factory needs from the container —
              parameters cannot be decorated.
            </p>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";

@service
class Boot {
  @factory(ChatClient)
  createChat() {
    return new ChatClient(app.get(NatsConn));
  }
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="@watch(Service)">
          <api-entry sig="@watch(ServiceClass, prop?)">
            <p>
              Subscribe a component method to changes on a DI-resolved service.
              This is now part of the unified <span class="ic">@watch</span> decorator —
              it detects whether you pass a string (local field), a <span class="ic">Reactive</span> instance,
              or a <strong>class constructor</strong> (DI lookup) and does the right thing.
            </p>
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
          </api-entry>
          <doc-notification type="note">
            <strong>Deprecation:</strong> The <span class="ic">watchService</span> export still works
            but is deprecated and will be removed in v1.0. Use <span class="ic">@watch(Service)</span> instead.
          </doc-notification>
        </doc-section>

        <doc-section heading="API Reference">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@service</code></td><td>Class</td><td>Auto-instantiated singleton, registered on <code>app.start()</code></td></tr>
              <tr><td><code>@inject(Key)</code></td><td>Accessor</td><td>Lazy getter — throws if not found</td></tr>
              <tr><td><code>@maybe(Key)</code></td><td>Accessor</td><td>Lazy getter — returns <code>undefined</code> if not found</td></tr>
              <tr><td><code>@factory(Key?)</code></td><td>Method</td><td>Return value registered as a provider on start</td></tr>
              <tr><td><code>@watch(Svc, prop?)</code></td><td>Method</td><td>Subscribe to DI-resolved Reactive service changes</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
