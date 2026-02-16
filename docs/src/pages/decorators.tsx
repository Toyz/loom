/**
 * Decorators — /features/decorators
 *
 * Complete API reference pulled from source JSDoc + real-world Placing.Space examples.
 */
import { LoomElement, component, css, mount } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { docStyles } from "../styles/doc-page";

/* ── Page-specific styles ── */

const styles = css`
  .decorator-entry {
    margin-bottom: var(--space-8, 2rem);
  }
  .decorator-entry:last-child {
    margin-bottom: 0;
  }

  .dec-sig {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-base, 0.9375rem);
    font-weight: 600;
    color: var(--accent, #818cf8);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .dec-desc {
    color: var(--text-secondary, #9898ad);
    font-size: var(--text-sm, 0.8125rem);
    margin-bottom: var(--space-3, 0.75rem);
    line-height: 1.6;
  }

  .dec-detail {
    color: var(--text-muted, #5e5e74);
    font-size: var(--text-xs, 0.75rem);
    margin-bottom: var(--space-3, 0.75rem);
    line-height: 1.5;
    padding-left: var(--space-4, 1rem);
    border-left: 2px solid var(--border-subtle, #1e1e2a);
  }

  .toc {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-2, 0.5rem);
    margin-bottom: var(--space-10, 2.5rem);
  }

  .toc a {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    background: var(--bg-surface, #121218);
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: var(--radius-sm, 6px);
    font-family: var(--font-mono, monospace);
    font-size: var(--text-xs, 0.75rem);
    font-weight: 500;
    color: var(--accent, #818cf8);
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .toc a:hover {
    background: var(--bg-hover, #22222e);
    border-color: var(--border-muted, #2a2a3a);
    text-decoration: none;
  }
  .toc-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 0.75rem);
  }
`;

@route("/features/decorators")
@component("page-decorators")
export class PageDecorators extends LoomElement {

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [...this.shadow.adoptedStyleSheets, styles];
  }

  scrollToSection(id: string) {
    this.shadow.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  update() {
    return (
      <div>
        <h1>Decorators</h1>
        <p class="subtitle">
          22 decorators across 8 categories. Each one is sourced directly from
          the framework implementation — descriptions, signatures, and examples
          all match the actual code.
        </p>

        {/* ── Table of Contents ── */}
        <div class="toc">
          <a onClick={() => this.scrollToSection("component")}><span class="toc-dot" style="background:var(--accent)"></span>@component</a>
          <a onClick={() => this.scrollToSection("reactive")}><span class="toc-dot" style="background:var(--amber)"></span>@reactive</a>
          <a onClick={() => this.scrollToSection("prop")}><span class="toc-dot" style="background:var(--amber)"></span>@prop</a>
          <a onClick={() => this.scrollToSection("computed")}><span class="toc-dot" style="background:var(--amber)"></span>@computed</a>
          <a onClick={() => this.scrollToSection("watch")}><span class="toc-dot" style="background:var(--amber)"></span>@watch</a>
          <a onClick={() => this.scrollToSection("on")}><span class="toc-dot" style="background:var(--rose)"></span>@on</a>
          <a onClick={() => this.scrollToSection("emit")}><span class="toc-dot" style="background:var(--rose)"></span>@emit</a>
          <a onClick={() => this.scrollToSection("query")}><span class="toc-dot" style="background:var(--emerald)"></span>@query</a>
          <a onClick={() => this.scrollToSection("queryall")}><span class="toc-dot" style="background:var(--emerald)"></span>@queryAll</a>
          <a onClick={() => this.scrollToSection("mount")}><span class="toc-dot" style="background:var(--cyan)"></span>@mount</a>
          <a onClick={() => this.scrollToSection("unmount")}><span class="toc-dot" style="background:var(--cyan)"></span>@unmount</a>
          <a onClick={() => this.scrollToSection("catch")}><span class="toc-dot" style="background:var(--cyan)"></span>@catch_</a>
          <a onClick={() => this.scrollToSection("suspend")}><span class="toc-dot" style="background:var(--cyan)"></span>@suspend</a>
          <a onClick={() => this.scrollToSection("service")}><span class="toc-dot" style="background:var(--text-secondary)"></span>@service</a>
          <a onClick={() => this.scrollToSection("inject")}><span class="toc-dot" style="background:var(--text-secondary)"></span>@inject</a>
          <a onClick={() => this.scrollToSection("factory")}><span class="toc-dot" style="background:var(--text-secondary)"></span>@factory</a>
          <a onClick={() => this.scrollToSection("interval")}><span class="toc-dot" style="background:var(--amber)"></span>@interval</a>
          <a onClick={() => this.scrollToSection("timeout")}><span class="toc-dot" style="background:var(--amber)"></span>@timeout</a>
          <a onClick={() => this.scrollToSection("animationframe")}><span class="toc-dot" style="background:var(--amber)"></span>@animationFrame</a>
          <a onClick={() => this.scrollToSection("propparam")}><span class="toc-dot" style="background:var(--emerald)"></span>@prop(param/query)</a>
          <a onClick={() => this.scrollToSection("transform")}><span class="toc-dot" style="background:var(--emerald)"></span>@transform</a>
          <a onClick={() => this.scrollToSection("guardnamed")}><span class="toc-dot" style="background:var(--rose)"></span>@guard(name)</a>
        </div>

        {/* ═══════════ Component ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="cube" size={20} color="var(--accent)"></loom-icon>
            <h2 id="component">Component</h2>
          </div>
          <div class="decorator-entry">
            <div class="dec-sig">@component(tag: string)</div>
            <div class="dec-desc">
              Register a class as a custom element. Wires <span class="ic">@prop</span> observed
              attributes and <span class="ic">attributeChangedCallback</span> auto-parsing.
              Registers the element with <span class="ic">app.register()</span>.
            </div>
            <code-block lang="ts" code={`@component("my-counter")
class MyCounter extends LoomElement {
  @prop label = "Count";
  @reactive count = 0;

  update() {
    return (
      <button onClick={() => this.count++}>
        {this.label}: {this.count}
      </button>
    );
  }
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ State ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            <h2>State</h2>
          </div>

          <div class="decorator-entry" id="reactive">
            <div class="dec-sig">@reactive</div>
            <div class="dec-desc">
              Internal reactive state. Creates a getter/setter backed by
              <span class="ic">Reactive&lt;T&gt;</span>. Changes schedule
              batched <span class="ic">update()</span> via microtask.
            </div>
            <code-block lang="ts" code={`@reactive count = 0;
@reactive userName = "";
@reactive items: string[] = [];`}></code-block>
          </div>

          <div class="decorator-entry" id="prop">
            <div class="dec-sig">@prop</div>
            <div class="dec-desc">
              External property. When set via HTML attribute, auto-parses from strings.
              When set via JSX property, accepts <strong>any type</strong> — arrays, objects, etc.
              Uses <span class="ic">@reactive</span> under the hood — so it triggers
              re-renders and supports <span class="ic">@watch</span>.
            </div>
            <code-block lang="ts" code={`// HTML attributes — auto-parsed from strings
@prop label = "Count";   // <my-counter label="Clicks">
@prop initial = 0;       // <my-counter initial="5"> → parsed as number
@prop disabled = false;  // <my-counter disabled="true"> → parsed as boolean

// JSX properties — any type, no parsing needed
@prop styles: CSSStyleSheet[] = [];
// <loom-outlet styles={[docStyles]}>`}></code-block>
          </div>

          <div class="decorator-entry" id="propparam">
            <div class="dec-sig">@prop({'{ param | params | query }'})</div>
            <div class="dec-desc">
              Route data injection. Bind route parameters or query strings directly
              to typed properties. Use <span class="ic">param</span> for a single
              route param, <span class="ic">params</span> for the full params object,
              or <span class="ic">query</span> for query string values.
            </div>
            <code-block lang="ts" code={`import { params, routeQuery } from "@toyz/loom";

// Single route param  →  /users/:id
@prop({ param: "id" })
@transform(Number)
userId!: number;

// Full params object  →  /users/:id/posts/:slug
@prop({ params })
routeParams!: { id: string; slug: string };

// Single query param  →  ?tab=settings
@prop({ query: "tab" })
tab!: string;

// Full query object   →  ?page=2&sort=name
@prop({ query: routeQuery })
qs!: { page: string; sort: string };`}></code-block>
          </div>

          <div class="decorator-entry" id="computed">
            <div class="dec-sig">@computed</div>
            <div class="dec-desc">
              Cached derived value. Re-computed only when reactive dependencies fire.
              Attach to a getter — the result is memoized until any
              <span class="ic">@reactive</span> dependency triggers a re-render.
            </div>
            <code-block lang="ts" code={`@computed
get displayName() {
  return \`\${this.firstName} \${this.lastName}\`;
}

@computed
get isValid() {
  return this.email.includes("@") && this.password.length >= 8;
}`}></code-block>
          </div>

          <div class="decorator-entry" id="watch">
            <div class="dec-sig">@watch(field: string)</div>
            <div class="dec-desc">
              React to specific field changes. Your handler receives the new and
              previous values. The watcher is wired into the field's
              <span class="ic">Reactive</span> subscriber, so it fires
              synchronously on change — before the batched <span class="ic">update()</span>.
            </div>
            <code-block lang="ts" code={`@watch("count")
onCountChange(newVal: number, oldVal: number) {
  console.log(\`count changed: \${oldVal} → \${newVal}\`);
}

@watch("selectedIndex")
onSelectionChange(idx: number) {
  this.scrollToItem(idx);
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ Events ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="broadcast" size={20} color="var(--rose)"></loom-icon>
            <h2>Events</h2>
          </div>

          <div class="decorator-entry" id="on">
            <div class="dec-sig">@on(EventClass)</div>
            <div class="dec-sig">@on(target: EventTarget, event: string)</div>
            <div class="dec-desc">
              Declarative event subscription. Auto-subscribed on connect, auto-cleaned
              on disconnect. Two modes: <strong>Bus events</strong> (pass a
              <span class="ic">LoomEvent</span> subclass) or <strong>DOM events</strong>
              (pass any EventTarget + event name).
            </div>
            <div class="dec-detail">
              From Placing.Space — listening for domain events on the global bus:
            </div>
            <code-block lang="ts" code={`// Bus event — typed handler, auto-subscribed on connect
@on(CooldownStart)
onCooldownStart(e: CooldownStart) {
  this.startCooldown(e.until);
}

@on(ColorSelect)
onColorSelect(e: ColorSelect) {
  this.select(e.index, e.rgb, e.name, false);
}

// DOM event — EventTarget binding with auto-cleanup
@on(window, "resize")
onResize(e: Event) {
  this.width = window.innerWidth;
}`}></code-block>
          </div>

          <div class="decorator-entry" id="emit">
            <div class="dec-sig">@emit(EventClass?, factory?)</div>
            <div class="dec-desc">
              Auto-broadcast to the bus. Two forms:
            </div>
            <div class="dec-detail">
              <strong>On a method:</strong> return value is auto-emitted (must be a
              <span class="ic">LoomEvent</span> subclass).<br/>
              <strong>On a field:</strong> fires an event via factory whenever the
              <span class="ic">@reactive</span> value changes.
            </div>
            <code-block lang="ts" code={`// Method: return value is auto-emitted
@emit()
placePixel(x: bigint, y: bigint): PixelPlaced {
  return new PixelPlaced(x, y, this.selectedColor);
}

// Field: factory converts reactive value → event
@reactive @emit(ColorSelect, idx => new ColorSelect(idx, 0))
selectedIndex = 0;`}></code-block>
          </div>
        </section>

        {/* ═══════════ DOM ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--emerald)"></loom-icon>
            <h2>DOM</h2>
          </div>

          <div class="decorator-entry" id="query">
            <div class="dec-sig">@query(selector: string)</div>
            <div class="dec-desc">
              Lazy shadow DOM <span class="ic">querySelector</span>. Returns the
              first match on access — no caching, always reads live DOM.
            </div>
            <code-block lang="ts" code={`@query(".submit-btn") submitBtn!: HTMLButtonElement;
@query(".palette") containerEl!: HTMLElement;
@query("canvas") canvas!: HTMLCanvasElement;`}></code-block>
          </div>

          <div class="decorator-entry" id="queryall">
            <div class="dec-sig">@queryAll(selector: string)</div>
            <div class="dec-desc">
              Lazy shadow DOM <span class="ic">querySelectorAll</span>. Returns an
              array (not a NodeList) on each access.
            </div>
            <code-block lang="ts" code={`@queryAll("input") inputs!: HTMLInputElement[];
@queryAll(".swatch") allSwatches!: HTMLElement[];`}></code-block>
          </div>
        </section>

        {/* ═══════════ Lifecycle ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--cyan)"></loom-icon>
            <h2>Lifecycle</h2>
          </div>

          <div class="decorator-entry" id="mount">
            <div class="dec-sig">@mount</div>
            <div class="dec-desc">
              Runs when the element connects to the DOM. Multiple
              <span class="ic">@mount</span> methods per class are allowed.
              No need to call <span class="ic">super.connectedCallback()</span>.
            </div>
            <code-block lang="ts" code={`@mount
setup() {
  this.shadow.adoptedStyleSheets = [styles];
  this.applySessionColor();
}

@mount
initCanvas() {
  this.ctx = this.canvas.getContext("2d");
}`}></code-block>
          </div>

          <div class="decorator-entry" id="unmount">
            <div class="dec-sig">@unmount</div>
            <div class="dec-desc">
              Runs when the element disconnects from the DOM. Multiple
              <span class="ic">@unmount</span> methods allowed. Use for
              manual cleanup — cancelling timers, closing connections, saving state.
            </div>
            <code-block lang="ts" code={`@unmount
teardown() {
  if (this.cdTimer) cancelAnimationFrame(this.cdTimer);
}

@unmount
saveState() {
  localStorage.setItem("state", JSON.stringify(this.state));
}`}></code-block>
          </div>

          <div class="decorator-entry" id="catch">
            <div class="dec-sig">@catch_(handler: (error: Error, element: LoomElement) =&gt; void)</div>
            <div class="dec-desc">
              Error boundary. Class decorator that wraps
              <span class="ic">update()</span> and
              <span class="ic">connectedCallback()</span> with try/catch.
              Named <span class="ic">catch_</span> since <code>catch</code> is a
              reserved word.
            </div>
            <code-block lang="ts" code={`@component("my-widget")
@catch_((err, el) => {
  el.shadow.replaceChildren(<div>{err.message}</div>);
})
class MyWidget extends LoomElement {
  update() {
    // If this throws, the catch handler renders the error
    return <div>{this.riskyComputation()}</div>;
  }
}`}></code-block>
          </div>

          <div class="decorator-entry" id="suspend">
            <div class="dec-sig">@suspend()</div>
            <div class="dec-desc">
              Async suspense. Wraps async methods to auto-manage loading/error state.
              Expects the component to have <span class="ic">@reactive loading</span> and
              <span class="ic">@reactive error</span> fields.
              If <span class="ic">@catch_</span> is present, errors are forwarded to it.
            </div>
            <code-block lang="ts" code={`@reactive loading = false;
@reactive error: Error | null = null;

@suspend()
async fetchUser() {
  const res = await fetch(\`/api/users/\${this.userId}\`);
  this.user = await res.json();
}
// While fetching: this.loading === true
// On error:       this.error is set, catch_ handler fires if present`}></code-block>
          </div>
        </section>

        {/* ═══════════ DI & Services ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--text-secondary)"></loom-icon>
            <h2>DI &amp; Services</h2>
          </div>

          <div class="decorator-entry" id="service">
            <div class="dec-sig">@service</div>
            <div class="dec-desc">
              Auto-instantiated singleton. Registered on
              <span class="ic">app.start()</span>. Constructor
              <span class="ic">@inject</span> params are resolved automatically.
            </div>
            <code-block lang="ts" code={`@service
class BookmarkStore extends CollectionStore<Bookmark> {
  constructor() {
    super("bookmarks", new LocalMedium("bookmarks"));
  }
}`}></code-block>
          </div>

          <div class="decorator-entry" id="inject">
            <div class="dec-sig">@inject(Key)</div>
            <div class="dec-desc">
              Dual-mode dependency injection. Use as a <strong>property
              decorator</strong> for lazy getter access, or as a <strong>parameter
              decorator</strong> on constructors and factory methods.
            </div>
            <code-block lang="ts" code={`// Property — lazy getter
@inject(AuthService) auth!: AuthService;

// Constructor parameter
constructor(@inject(Config) config: Config) { ... }

// Factory method parameter
@factory(ChatClient)
createChat(@inject(NatsConnection) nc: NatsConnection) {
  return new ChatClient(nc);
}`}></code-block>
          </div>

          <div class="decorator-entry" id="factory">
            <div class="dec-sig">@factory(Key?)</div>
            <div class="dec-desc">
              Method decorator on <span class="ic">@service</span> classes.
              Return value is registered as a provider on
              <span class="ic">app.start()</span>. Supports
              <span class="ic">@inject</span> on parameters. Async methods
              are awaited.
            </div>
            <code-block lang="ts" code={`@service
class Boot {
  @factory(ChatServiceNatsClient)
  createChat(@inject(NatsConnection) nc: NatsConnection) {
    return new ChatServiceNatsClient(nc);
  }
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ Timing ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>Timing</h2>
          </div>

          <div class="decorator-entry" id="interval">
            <div class="dec-sig">@interval(ms: number)</div>
            <div class="dec-desc">
              Auto-cleaned <span class="ic">setInterval</span>. Runs the method
              every <span class="ic">ms</span> milliseconds. Timer is started on
              connect and automatically cleared on disconnect.
            </div>
            <code-block lang="ts" code={`@interval(1000)
tick() {
  this.elapsed++;
  this.time = new Date().toLocaleTimeString();
}`}></code-block>
          </div>

          <div class="decorator-entry" id="timeout">
            <div class="dec-sig">@timeout(ms: number)</div>
            <div class="dec-desc">
              Auto-cleaned <span class="ic">setTimeout</span>. Runs the method
              once after <span class="ic">ms</span> milliseconds. Timer is
              started on connect and automatically cleared on disconnect.
            </div>
            <code-block lang="ts" code={`@timeout(3000)
hideWelcome() {
  this.$(".welcome")?.remove();
}`}></code-block>
          </div>

          <div class="decorator-entry" id="animationframe">
            <div class="dec-sig">@animationFrame(layer?: number)</div>
            <div class="dec-desc">
              Centralized <span class="ic">requestAnimationFrame</span> loop via
              <span class="ic">RenderLoop</span>. Method receives
              <span class="ic">(deltaTime, timestamp)</span>. Use
              <span class="ic">layer</span> to control execution order — lower
              layers run first.
            </div>
            <code-block lang="ts" code={`@animationFrame(0)   // physics first
physics(dt: number) {
  this.velocity += this.gravity * dt;
  this.y += this.velocity * dt;
}

@animationFrame(10)  // rendering after physics
draw(dt: number, t: number) {
  this.ctx.clearRect(0, 0, this.w, this.h);
  this.ctx.fillRect(this.x, this.y, 10, 10);
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ Route Data ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="map" size={20} color="var(--emerald)"></loom-icon>
            <h2>Route Data</h2>
          </div>

          <div class="decorator-entry" id="transform">
            <div class="dec-sig">@transform(fn: (value: any) =&gt; T)</div>
            <div class="dec-desc">
              Type conversion for route data. Apply to any <span class="ic">@prop({'{ param }'})</span>,
              <span class="ic">@prop({'{ params }'})</span>, or <span class="ic">@prop({'{ query }'})</span> property
              to convert the raw value into a typed result. Works on single string params <em>and</em> full
              object decomposition.
            </div>
            <code-block lang="ts" code={`// Single param — string → number
@prop({ param: "id" })
@transform(Number)         // "42" → 42
userId!: number;

// Single query — string → boolean
@prop({ query: "active" })
@transform(v => v === "true")  // "true" → true
active!: boolean;

// Type-safe object decompose via typed<T>()
interface RouteParams { id: number; slug: string }

@prop({ params })
@transform(typed<RouteParams>({ id: Number }))
routeParams!: RouteParams;
// TS enforces: id converter MUST return number, slug passes through`}></code-block>
          </div>

          <div class="decorator-entry" id="guardnamed">
            <div class="dec-sig">@guard(name?: string)</div>
            <div class="dec-desc">
              Named injectable guard. Register a method as a guard that can be referenced by name
              in <span class="ic">@route</span> definitions. Guards can use <span class="ic">@inject</span> parameters
              for DI access. Return <span class="ic">true</span> to allow,
              <span class="ic">false</span> to block, or a <span class="ic">string</span> to redirect.
            </div>
            <code-block lang="ts" code={`@service
class Guards {
  @guard("auth")
  checkAuth(@inject(AuthService) auth: AuthService) {
    return auth.isLoggedIn ? true : "/login";
  }

  @guard("admin")
  checkAdmin(@inject(AuthService) auth: AuthService) {
    return auth.role === "admin" || "/403";
  }
}

// Reference guards by name in route config:
@route("/admin", { guards: ["auth", "admin"] })
@component("page-admin")
class PageAdmin extends LoomElement { }`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
