/**
 * DI — Decorators  /di/decorators
 *
 * @service, @inject, @factory reference page.
 */
import { LoomElement } from "@toyz/loom";

export default class PageDIDecorators extends LoomElement {
  update() {
    return (
      <div>
        <h1>Decorators</h1>
        <p class="subtitle">DI-specific decorators for services, injection, and provider factories.</p>

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
            Dual-mode dependency injection. Use as a <strong>property decorator</strong> for
            a lazy getter, or as a <strong>parameter decorator</strong> on constructors and
            factory methods.
          </p>
          <code-block lang="ts" code={`// Property — lazy getter
@inject(AuthService) auth!: AuthService;

// Constructor parameter
constructor(@inject(Config) cfg: Config) { ... }

// In a component
@component("user-profile")
class UserProfile extends LoomElement {
  @inject(AuthService) auth!: AuthService;

  update() {
    return <p>Logged in as {this.auth.currentUser.name}</p>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>@factory</h2>
          <p>
            Method decorator on <span class="ic">@service</span> classes.
            The return value is registered as a provider on <span class="ic">app.start()</span>.
            Supports <span class="ic">@inject</span> on parameters. Async methods are awaited.
          </p>
          <code-block lang="ts" code={`@service
class Boot {
  @factory(ChatClient)
  createChat(@inject(NatsConn) nc: NatsConn) {
    return new ChatClient(nc);
  }
}`}></code-block>
        </section>

        <section>
          <h2>@watch(Service) <span class="badge deprecated">unified</span></h2>
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
          <p>
            <strong>Deprecation:</strong> The <span class="ic">watchService</span> export still works
            but is deprecated and will be removed in v1.0. Use <span class="ic">@watch(Service)</span> instead.
          </p>
        </section>

        <section>
          <h2>API Reference</h2>
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@service</code></td><td>Class</td><td>Auto-instantiated singleton, registered on <code>app.start()</code></td></tr>
              <tr><td><code>@inject(Key)</code></td><td>Property / Parameter</td><td>Lazy getter or constructor param resolution</td></tr>
              <tr><td><code>@factory(Key?)</code></td><td>Method</td><td>Return value registered as provider</td></tr>
              <tr><td><code>@watch(Svc, prop?)</code></td><td>Method</td><td>Subscribe to DI-resolved Reactive service changes</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
