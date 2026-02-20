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
import { DECORATOR_LIST, DECORATOR_COUNT } from "../../data/decorators";

export default class PageDecoratorsOverview extends LoomElement {

  update() {
    return (
      <div>
        <h1>Decorators</h1>
        <p class="subtitle">
          {DECORATOR_COUNT} core decorators. <span class="ic">createDecorator</span> is the
          foundation — every built-in decorator is built on it.
        </p>

        {/* ═══════════ Foundation ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>createDecorator</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">createDecorator&lt;Args, T&gt;(setup, options?)</div>
            <div class="dec-desc">
              The universal factory every Loom decorator is built on.
              Setup runs at <span class="ic">define-time</span> on the prototype.
              Return a function for <span class="ic">connect</span> behavior.
              Return another from connect for <span class="ic">disconnect</span> cleanup.
              Use <span class="ic">{`{ class: true }`}</span> for class decorators.
            </div>
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
          </div>
        </section>

        {/* ═══════════ State ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            <h2>State</h2>
          </div>

          <div class="feature-entry" id="reactive">
            <div class="dec-sig">@reactive</div>
            <div class="dec-desc">
              Internal reactive state backed by <span class="ic">Reactive&lt;T&gt;</span>.
              Changes schedule batched <span class="ic">update()</span> via microtask.
            </div>
            <code-block lang="ts" code={`@reactive accessor count = 0;
@reactive accessor userName = "";
@reactive accessor items: string[] = [];`}></code-block>
          </div>

          <div class="feature-entry" id="prop">
            <div class="dec-sig">@prop</div>
            <div class="dec-desc">
              External property. Auto-parses HTML attributes (number, boolean, string)
              and accepts any type via JSX. Uses <span class="ic">@reactive</span> under the hood.
            </div>
            <code-block lang="ts" code={`@prop accessor label = "Count";   // <my-counter label="Clicks">
@prop accessor initial = 0;       // parsed as number
@prop accessor disabled = false;  // parsed as boolean`}></code-block>
          </div>

          <div class="feature-entry" id="computed">
            <div class="dec-sig">@computed</div>
            <div class="dec-desc">
              Cached derived value on a getter. Re-computed only when <span class="ic">@reactive</span> dependencies trigger a re-render.
            </div>
            <code-block lang="ts" code={`@computed
get displayName() {
  return \`\${this.firstName} \${this.lastName}\`;
}`}></code-block>
          </div>

          <div class="feature-entry" id="watch">
            <div class="dec-sig">@watch(field: string)</div>
            <div class="dec-sig">@watch(store: Reactive)</div>
            <div class="dec-sig">@watch(Service, "prop"?)</div>
            <div class="dec-desc">
              Reacts to state changes. Handler receives <span class="ic">(value, prev)</span>.
              For stores and services, auto-calls <span class="ic">scheduleUpdate()</span> and
              cleans up on disconnect.
            </div>
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
          </div>

          <div class="feature-entry" id="readonly">
            <div class="dec-sig">@readonly</div>
            <div class="dec-desc">
              Composable immutability. Freezes the value after the first set — subsequent
              assignments throw. Objects and arrays are <span class="ic">Object.freeze()</span>'d
              in the getter. Stack with <span class="ic">@reactive</span> or <span class="ic">@prop</span>
              by placing <span class="ic">@readonly</span> first (outermost).
            </div>
            <code-block lang="ts" code={`// Set once, locked forever
@readonly @reactive accessor id = crypto.randomUUID();

// Props from parent update, but child can't mutate
@readonly @prop accessor users!: User[];

// Standalone — frozen after init
@readonly accessor config = { theme: "dark" };`}></code-block>
          </div>
        </section>

        {/* ═══════════ See Also ═══════════ */}

        <section>
          <h2>More Decorators</h2>
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
        </section>
      </div>
    );
  }
}
