/**
 * Element — Decorators  /element/decorators
 *
 * @component, @reactive, @prop, @computed, @mount, @unmount,
 * @query, @queryAll, @catch_, @suspend, @slot, @transition,
 * @event, @observer reference page.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementDecorators extends LoomElement {
  update() {
    return (
      <div>
        <h1>Decorators</h1>
        <p class="subtitle">Element-specific decorators for registration, state, lifecycle, and DOM queries.</p>

        <section>
          <h2>@component</h2>
          <p>
            Registers a class as a custom element. This is the entry point for every
            Loom component.
          </p>
          <code-block lang="ts" code={`import { component, LoomElement } from "@toyz/loom";

@component("my-counter")
class MyCounter extends LoomElement {
  update() {
    return <p>Hello from MyCounter</p>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>@reactive</h2>
          <p>
            Internal reactive state. Changes schedule batched <span class="ic">update()</span> via
            microtask. Backed by <span class="ic">Reactive&lt;T&gt;</span>.
          </p>
          <code-block lang="ts" code={`@reactive accessor count = 0;
@reactive accessor userName = "";
@reactive accessor items: string[] = [];`}></code-block>
        </section>

        <section>
          <h2>@prop</h2>
          <p>
            External property. Auto-parses HTML attributes (number, boolean, string)
            and accepts any type via JSX. Uses <span class="ic">@reactive</span> under the hood.
          </p>
          <code-block lang="ts" code={`@prop accessor label = "Count";   // <my-counter label="Clicks">
@prop accessor initial = 0;       // parsed as number
@prop accessor disabled = false;  // parsed as boolean`}></code-block>
        </section>

        <section>
          <h2>@computed</h2>
          <p>
            Cached derived value on a getter. Re-computed only when <span class="ic">@reactive</span> dependencies
            trigger a re-render.
          </p>
          <code-block lang="ts" code={`@computed
get displayName() {
  return \`\${this.firstName} \${this.lastName}\`;
}`}></code-block>
        </section>

        <section>
          <h2>Lifecycle</h2>

          <h3>@mount</h3>
          <p>Runs once when the element is connected to the DOM.</p>
          <code-block lang="ts" code={`@mount
setup() {
  console.log("Connected!");
}`}></code-block>

          <h3>@unmount</h3>
          <p>Runs once when the element is disconnected from the DOM.</p>
          <code-block lang="ts" code={`@unmount
cleanup() {
  console.log("Disconnected!");
}`}></code-block>

          <h3>@catch_</h3>
          <p>Error boundary — catches errors thrown during <span class="ic">update()</span>.</p>

          <h3>@suspend</h3>
          <p>Suspense boundary — shows fallback while async work resolves.</p>
        </section>

        <section>
          <h2>DOM Queries</h2>
          <code-block lang="ts" code={`// Single element
@query(".my-input") input!: HTMLInputElement;

// Multiple elements
@queryAll("li") items!: NodeListOf<HTMLLIElement>;`}></code-block>
        </section>

        <section>
          <h2>@styles</h2>
          <p>
            Auto-adopt <span class="ic">CSSStyleSheet</span>s when the element connects.
            Use with the <span class="ic">css</span> tagged template. Multiple calls stack.
          </p>
          <code-block lang="ts" code={`import { component, styles, css, LoomElement } from "@toyz/loom";

const sheet = css\`
  :host { display: block; }
  .title { font-weight: 700; color: var(--accent); }
\`;

@component("my-widget")
@styles(sheet)
class MyWidget extends LoomElement {
  update() {
    return <h2 class="title">Styled!</h2>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>@slot</h2>
          <p>
            Typed access to slot-assigned elements. Updates automatically on
            <span class="ic">slotchange</span> and triggers re-render.
          </p>
          <code-block lang="ts" code={`// Default slot
@slot()
content!: Element[];

// Named slot with type
@slot<CardHeader>("header")
headers!: CardHeader[];

// Heterogeneous slot content
@slot<CardHeader, CardBody, CardFooter>("content")
sections!: (CardHeader | CardBody | CardFooter)[];`}></code-block>
        </section>

        <section>
          <h2>@transition</h2>
          <p>
            Enter/leave CSS animations for conditional DOM. Wraps a render method to
            apply animations when content appears or disappears.
          </p>
          <code-block lang="ts" code={`@transition({ enter: "fade-in 300ms", leave: "fade-out 200ms" })
renderPanel() {
  if (!this.showPanel) return null;
  return <div class="panel">...</div>;
}

// Also supports CSS classes instead of animation shorthands:
@transition({ enterClass: "slide-in", leaveClass: "slide-out" })
renderDrawer() {
  if (!this.open) return null;
  return <aside class="drawer">...</aside>;
}`}></code-block>
        </section>

        <section>
          <h2>@event&lt;T&gt;</h2>
          <p>
            Typed callback prop for component-to-parent communication. Decorates an
            auto-accessor that stores a function reference. The JSX runtime sets it as
            a JS property — no <span class="ic">addEventListener</span> heuristic interference.
          </p>
          <h3>Declaring an event</h3>
          <code-block lang="ts" code={`import { event, component, LoomElement } from "@toyz/loom";

type DrawFn = (ctx: CanvasRenderingContext2D, dt: number, t: number) => void;

@component("my-canvas")
class MyCanvas extends LoomElement {
  // Declare the callback prop with a type
  @event<DrawFn>() accessor draw: DrawFn | null = null;

  // Call it when you need to — null-safe
  tick(dt: number, t: number) {
    this.draw?.(this.ctx, dt, t);
  }
}`}></code-block>
          <h3>Consumer usage</h3>
          <code-block lang="tsx" code={`// Parent component passes a callback via JSX — clean, declarative
<my-canvas draw={(ctx, dt, t) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#818cf8";
  ctx.fillRect(Math.sin(t) * 100 + 200, 100, 40, 40);
}} />`}></code-block>
          <h3>With custom form events</h3>
          <code-block lang="ts" code={`type SubmitFn = (data: Record<string, string>) => void;

@component("my-form")
class MyForm extends LoomElement {
  @event<SubmitFn>() accessor onsubmit: SubmitFn | null = null;

  handleSubmit() {
    const data = this.collectFormData();
    this.onsubmit?.(data);
  }
}

// Usage:
<my-form onsubmit={(data) => console.log("Submitted:", data)} />`}></code-block>
        </section>

        <section>
          <h2>@observer</h2>
          <p>
            Auto-managed DOM observers. Creates the observer when the element connects,
            calls <span class="ic">.observe(this)</span>, and auto-disconnects on unmount.
            The decorated method receives each entry individually. Supports three modes:
          </p>

          <h3>Resize</h3>
          <p>
            Respond to element size changes — perfect for canvas scaling,
            responsive layouts, or chart redrawing.
          </p>
          <code-block lang="ts" code={`import { observer, component, LoomElement, query } from "@toyz/loom";

@component("responsive-canvas")
class ResponsiveCanvas extends LoomElement {
  @query("canvas") accessor canvas!: HTMLCanvasElement;

  @observer("resize")
  onResize(entry: ResizeObserverEntry) {
    const { width, height } = entry.contentRect;
    const dpr = devicePixelRatio;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.getContext("2d")!.scale(dpr, dpr);
    this.redraw();
  }
}`}></code-block>

          <h3>Intersection</h3>
          <p>
            Detect when components enter or leave the viewport — ideal for
            lazy loading, analytics tracking, or play/pause behavior.
          </p>
          <code-block lang="ts" code={`@component("lazy-image")
class LazyImage extends LoomElement {
  @prop accessor src = "";
  @reactive accessor loaded = false;

  @observer("intersection", { threshold: 0.1, rootMargin: "200px" })
  onVisible(entry: IntersectionObserverEntry) {
    if (entry.isIntersecting && !this.loaded) {
      this.loaded = true;  // triggers re-render with real <img>
    }
  }

  update() {
    return this.loaded
      ? <img src={this.src} />
      : <div class="skeleton" />;
  }
}`}></code-block>

          <h3>Mutation</h3>
          <p>
            Watch for DOM changes inside the element — useful for auto-counting
            children, syncing state with light DOM, or tracking slot content.
          </p>
          <code-block lang="ts" code={`@component("auto-counter")
class AutoCounter extends LoomElement {
  @reactive accessor childCount = 0;

  @observer("mutation", { childList: true, subtree: true })
  onChildChange(record: MutationRecord) {
    this.childCount = this.children.length;
  }

  update() {
    return (
      <div>
        <span class="badge">{this.childCount} items</span>
        <slot></slot>
      </div>
    );
  }
}`}></code-block>
        </section>

        <section>
          <h2>API Reference</h2>
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@component(tag)</code></td><td>Class</td><td>Register custom element</td></tr>
              <tr><td><code>@styles(sheet, ...)</code></td><td>Class</td><td>Auto-adopt CSSStyleSheets on connect</td></tr>
              <tr><td><code>@reactive</code></td><td>Field</td><td>Reactive state, triggers <code>update()</code></td></tr>
              <tr><td><code>@prop</code></td><td>Field</td><td>External attribute/property, auto-parsed</td></tr>
              <tr><td><code>@computed</code></td><td>Getter</td><td>Cached derived value</td></tr>
              <tr><td><code>@mount</code></td><td>Method</td><td>Run on connect</td></tr>
              <tr><td><code>@unmount</code></td><td>Method</td><td>Run on disconnect</td></tr>
              <tr><td><code>@catch_</code></td><td>Method</td><td>Error boundary handler</td></tr>
              <tr><td><code>@suspend</code></td><td>Method</td><td>Suspense fallback</td></tr>
              <tr><td><code>@query(sel)</code></td><td>Field</td><td>Shadow DOM querySelector</td></tr>
              <tr><td><code>@queryAll(sel)</code></td><td>Field</td><td>Shadow DOM querySelectorAll</td></tr>
              <tr><td><code>@slot(name?)</code></td><td>Field</td><td>Typed slot-assigned elements, auto-updates on slotchange</td></tr>
              <tr><td><code>@transition(opts)</code></td><td>Method</td><td>Enter/leave CSS animations for conditional DOM</td></tr>
              <tr><td><code>@event&lt;T&gt;()</code></td><td>Accessor</td><td>Typed callback prop (stored as JS property)</td></tr>
              <tr><td><code>@observer(type, opts?)</code></td><td>Method</td><td>Auto-managed Resize/Intersection/Mutation observer</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
