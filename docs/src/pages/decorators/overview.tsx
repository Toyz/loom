/**
 * Decorators Overview — /decorators/overview
 *
 * createDecorator foundation + core state decorators (@reactive, @prop, @computed, @watch).
 * Specific decorator groups have their own pages:
 *   - Events: /decorators/events
 *   - Transform: /decorators/transform
 *   - Lifecycle/Timing/DOM: under /element/*
 *   - DI: /di/overview
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorsOverview extends LoomElement {

  update() {
    return (
      <div>
        <doc-header title="Decorators" subtitle="Every built-in decorator, and the one function they are all built on."></doc-header>

        <section>
          <p>Loom is built on TC39 stage-3 decorators — the standard ones, not the legacy TypeScript flavour, so there is no <span class="ic">experimentalDecorators</span> flag and no parameter decorators anywhere in the API. Every decorator here attaches to a class, a field, an <span class="ic">accessor</span>, or a method, and the one it attaches to is part of its contract.</p>
          <p>They divide into three jobs. Some declare state the renderer should watch. Some register a side effect and its teardown in the same line, so a timer or listener cannot outlive the element. The rest replace a method with a wrapped version. Knowing which of the three you are using explains most of the surprises — a wrapper only runs when you call it, a registration runs on its own.</p>
        </section>

        {/* ═══════════ Foundation ═══════════ */}

        <doc-section heading="createDecorator">
          <api-entry sig="createDecorator&lt;Args, T&gt;(setup, options?)">
            <p>
              The universal factory every Loom decorator is built on.
              Setup runs at <span class="ic">define-time</span> on the prototype.
              Return a function for <span class="ic">connect</span> behavior.
              Return another from connect for <span class="ic">disconnect</span> cleanup.
              Use <span class="ic">{`{ class: true }`}</span> for class decorators.
            </p>
            <code-block lang="ts" code={`import { createDecorator } from "@toyz/loom";

// Define-time only — lazy property getter
const cached = createDecorator<[key: string]>((proto, key, storageKey) => {
  Object.defineProperty(proto, key, {
    get() { return localStorage.getItem(storageKey); }
  });
});

// Lifecycle — setup on connect, cleanup on disconnect
const observeResize = createDecorator<[string]>((proto, key, selector) => {
  return (el) => {                              // runs on connect
    const target = el.shadow.querySelector(selector);
    const ro = new ResizeObserver(() => el.scheduleUpdate());
    if (target) ro.observe(target);
    return () => ro.disconnect();               // runs on disconnect
  };
});

// Class decorator
const tag = createDecorator<[string]>((ctor, name) => {
  customElements.define(name, ctor);
}, { class: true });`}></code-block>
          </api-entry>
        </doc-section>
        {/* ═══════════ State ═══════════ */}

        <doc-section heading="State">

          <api-entry sig="@reactive" id="reactive">
            <p>
              Internal reactive state backed by <span class="ic">Reactive&lt;T&gt;</span>.
              Changes schedule batched <span class="ic">update()</span> via microtask.
            </p>
            <code-block lang="ts" code={`@reactive accessor count = 0;
@reactive accessor userName = "";
@reactive accessor items: string[] = [];`}></code-block>
          </api-entry>
          <api-entry sig="@prop" id="prop">
            <p>
              External property. Auto-parses HTML attributes (number, boolean, string)
              and accepts any type via JSX. Uses <span class="ic">@reactive</span> under the hood.
            </p>
            <code-block lang="ts" code={`@prop accessor label = "Count";   // <my-counter label="Clicks">
@prop accessor initial = 0;       // parsed as number
@prop accessor disabled = false;  // parsed as boolean`}></code-block>
          </api-entry>
          <api-entry sig="@computed" id="computed">
            <p>
              Cached derived value on a getter. Re-computed only when <span class="ic">@reactive</span> dependencies trigger a re-render.
            </p>
            <code-block lang="ts" code={`@computed
get displayName() {
  return \`\${this.firstName} \${this.lastName}\`;
}`}></code-block>
          </api-entry>
          <api-entry sig="@watch(field: string)" id="watch">
            <div class="dec-sig">@watch(store: Reactive)</div>
            <div class="dec-sig">@watch(Service, "prop"?)</div>
            <p>
              Reacts to state changes. Handler receives <span class="ic">(value, prev)</span>.
              For stores and services, auto-calls <span class="ic">scheduleUpdate()</span> and
              cleans up on disconnect.
            </p>
            <code-block lang="ts" code={`// Local @reactive field
@watch("count")
onCount(val: number, prev: number) { }

// Direct Reactive instance
@watch(todos)
onTodos(items: Todo[], prev: Todo[]) { }

// DI-resolved service (watches the service itself if it extends Reactive)
@watch(TodoStore)
onTodos(items: Todo[], prev: Todo[]) { }

// DI-resolved service property
@watch(ThemeService, "theme")
onTheme(val: string, prev: string) { }`}></code-block>
          </api-entry>
          <api-entry sig="@readonly" id="readonly">
            <p>
              Composable immutability. Freezes the value after the first set — subsequent
              assignments throw. Objects and arrays are <span class="ic">Object.freeze()</span>'d
              in the getter. Stack with <span class="ic">@reactive</span> or <span class="ic">@prop</span>{" "}
              by placing <span class="ic">@readonly</span> first (outermost).
            </p>
            <code-block lang="ts" code={`// Set once, locked forever
@readonly @reactive accessor id = crypto.randomUUID();

// Props from parent update, but child can't mutate
@readonly @prop accessor users!: User[];

// Standalone — frozen after init
@readonly accessor config = { theme: "dark" };`}></code-block>
          </api-entry>
        </doc-section>
        {/* ═══════════ See Also ═══════════ */}

        <doc-section heading="More Decorators">
          <table class="api-table">
            <thead><tr><th>Category</th><th>Decorators</th><th>Page</th></tr></thead>
            <tbody>
              <tr>
                <td>Events</td>
                <td><code>@on</code>, <code>@emit</code></td>
                <td><loom-link to="/decorators/events" style="color: var(--accent)">Events</loom-link></td>
              </tr>
              <tr>
                <td>Transform</td>
                <td><code>@transform</code>, <code>typed&lt;T&gt;</code></td>
                <td><loom-link to="/decorators/transform" style="color: var(--accent)">Transform</loom-link></td>
              </tr>
              <tr>
                <td>Lifecycle</td>
                <td><code>@mount</code>, <code>@unmount</code>, <code>@catch_</code>, <code>@suspend</code></td>
                <td><loom-link to="/element/lifecycle" style="color: var(--accent)">Lifecycle</loom-link></td>
              </tr>
              <tr>
                <td>Timing</td>
                <td><code>@interval</code>, <code>@timeout</code>, <code>@debounce</code>, <code>@throttle</code>, <code>@animationFrame</code></td>
                <td><loom-link to="/element/timing" style="color: var(--accent)">Timing</loom-link></td>
              </tr>
              <tr>
                <td>DOM</td>
                <td><code>@query</code>, <code>@queryAll</code></td>
                <td><loom-link to="/element/queries" style="color: var(--accent)">Queries</loom-link></td>
              </tr>
              <tr>
                <td>DI</td>
                <td><code>@service</code>, <code>@inject</code>, <code>@factory</code>, <code>@watchService</code></td>
                <td><loom-link to="/di/overview" style="color: var(--accent)">DI &amp; Services</loom-link></td>
              </tr>
              <tr>
                <td>Router</td>
                <td><code>@route</code>, <code>@group</code>, <code>@guard</code></td>
                <td><loom-link to="/router/overview" style="color: var(--accent)">Router</loom-link></td>
              </tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
