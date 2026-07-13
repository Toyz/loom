/**
 * Attributes — /element/attributes
 *
 * LoomAttribute + @attribute — custom attribute controllers (directives)
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementAttributes extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Attributes"
          subtitle="Custom attribute controllers — behavior you attach to any element, not a tag."
        ></doc-header>

        <section>
          <p class="lead">
            <span class="ic">LoomAttribute</span> is to attributes what <span class="ic">LoomElement</span> is
            to tags. Instead of registering a custom element, you register a custom
            <em> attribute</em>. Whenever an element gains that attribute — rendered by
            Loom's JSX, hydrated from Declarative Shadow DOM, or hand-written in HTML —
            Loom instantiates a controller bound to that element and drives its lifecycle.
          </p>
          <code-block lang="tsx" code={`<div sticky intersect={load} shortcut="j">`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="plug" size={20} color="var(--accent)"></loom-icon>
            <h2>@attribute</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@attribute(name)</div>
            <div class="dec-desc">
              Registers a class as a controller for the attribute <span class="ic">name</span>.
              The name is arbitrary — <span class="ic">data-tooltip</span>, <span class="ic">sticky</span>,
              <span class="ic">shortcut</span> all work.
            </div>
            <code-block lang="ts" code={`import { LoomAttribute, attribute } from "@toyz/loom";

@attribute("data-tooltip")
class Tooltip extends LoomAttribute {
  connect() {
    this.el.classList.add("tooltip");
    this.el.setAttribute("aria-label", this.value);
  }
  valueChanged(_old: string, next: string) {
    this.el.setAttribute("aria-label", next);
  }
  disconnect() {
    this.el.classList.remove("tooltip");
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--emerald)"></loom-icon>
            <h2>Lifecycle</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">Three hooks, mirroring LoomElement:</div>
            <code-block lang="ts" code={`connect()                    // attribute appeared on a connected element
valueChanged(old, next)      // attribute value was patched
disconnect()                 // attribute removed, or element left the DOM`}></code-block>
            <div class="dec-desc">
              The base also gives you <span class="ic">this.el</span>, <span class="ic">this.name</span>,
              <span class="ic">this.value</span>, plus the same <span class="ic">on</span> /
              <span class="ic">emit</span> / <span class="ic">track</span> / <span class="ic">app</span> helpers
              as LoomElement. Anything you <span class="ic">track()</span> is cleaned up on disconnect.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--amber)"></loom-icon>
            <h2>Passing args as props</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              HTML attributes are strings, but JSX lets you pass anything. When you write
              <span class="ic">{`intersect={load}`}</span>, Loom sets a marker attribute (so it is
              observed and morphed) and stashes the raw value on <span class="ic">this.arg</span>.
              Every element decorator works on a controller and targets <span class="ic">this.el</span>,
              so there is no hand-rolled observer boilerplate:
            </div>
            <code-block lang="ts" code={`@attribute("intersect")
class Intersect extends LoomAttribute<() => void> {
  @observer("intersection")           // observes this.el automatically
  onVisible(e: IntersectionObserverEntry) {
    if (e.isIntersecting) this.arg(); // this.arg is the load fn
  }
}`}></code-block>
            <div class="dec-desc">
              For plain string attributes (<span class="ic">shortcut="j"</span>) or hand-written HTML,
              <span class="ic">this.arg</span> equals <span class="ic">this.value</span>. Bare attributes
              (<span class="ic">sticky</span>) give <span class="ic">this.arg === true</span>.
            </div>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Structured args flow through Loom's <span class="ic">@prop</span> system. Pass an object
              and each key lands on the matching reactive field:
            </div>
            <code-block lang="tsx" code={`@attribute("tooltip")
class Tooltip extends LoomAttribute {
  @prop accessor text = "";
  @prop accessor placement: "top" | "bottom" = "top";
  connect() { /* this.text, this.placement are set */ }
}

<button tooltip={{ text: "Save", placement: "bottom" }}>Save</button>`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="external-link" size={20} color="var(--accent)"></loom-icon>
            <h2>Rendering — attributes as portals</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              A controller is a full component wrapped onto a foreign element. Override
              <span class="ic">update()</span> to render JSX; Loom mounts it into a target
              location and re-morphs it whenever a reactive field changes — a smart portal.
            </div>
            <code-block lang="tsx" code={`@attribute("tooltip")
class Tooltip extends LoomAttribute {
  @prop accessor text = "";
  update() {
    return <div class="bubble">{this.text}</div>;  // mounted into document.body
  }
}`}></code-block>
            <div class="dec-desc">
              The portal target resolves in this order:
              runtime <span class="ic">this.to</span> prop →
              <span class="ic">@attribute(name, {`{ target }`})</span> option →
              <span class="ic">get target()</span> override → <span class="ic">document.body</span>.
              It is re-resolved on every render, so the output moves if the target changes.
            </div>
            <code-block lang="tsx" code={`// 1. Option — fixed target for every instance
@attribute("tooltip", { target: "#modal-root" })
class Tooltip extends LoomAttribute { /* ... */ }

// 2. Runtime — control the location per-element via the reserved \`to\` prop
<button tooltip={{ text: "Save", to: "#toolbar-portal" }}>Save</button>

// 3. Code — anchor to the host element itself
get target() { return this.el; }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            <h2>Typing your attributes</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Augment <span class="ic">LoomCustomAttributes</span> so your directives type-check on
              every intrinsic element.
            </div>
            <code-block lang="ts" code={`declare module "@toyz/loom/jsx-runtime" {
  interface LoomCustomAttributes {
    sticky?: boolean;
    shortcut?: string;
    intersect?: () => void;
  }
}

// now type-checks on any element:
<div sticky intersect={load} shortcut="j" />`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sun" size={20} color="var(--emerald)"></loom-icon>
            <h2>Light DOM & hand-written HTML</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Controllers inside a component's shadow root are wired automatically. For light-DOM
              or top-level HTML mount points, observe a root yourself:
            </div>
            <code-block lang="ts" code={`import { observeAttributes } from "@toyz/loom";

observeAttributes(document.body);`}></code-block>
            <div class="dec-desc">
              It scans immediately, then reacts to attribute and child-list changes. Returns an
              unobserve function.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>Which decorators work</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Decorators that route through connect hooks work on controllers.
              DOM-targeting ones (<span class="ic">@observer</span>, <span class="ic">@hotkey</span>)
              automatically target <span class="ic">this.el</span>; the rest are element-agnostic:
              <span class="ic">@interval</span>, <span class="ic">@timeout</span>,
              <span class="ic">@debounce</span>, <span class="ic">@throttle</span>,
              <span class="ic">@watch</span>, <span class="ic">@on</span>, <span class="ic">@log</span>,
              <span class="ic">@prop</span> / <span class="ic">@reactive</span> (drive
              <span class="ic">update()</span> re-renders).
            </div>
            <code-block lang="ts" code={`@attribute("data-ticker")
class Ticker extends LoomAttribute {
  @interval(1000)
  tick() { console.log("tick", this.el); }
}`}></code-block>
            <div class="dec-desc">
              Once a controller renders (<span class="ic">update()</span> overridden or
              <span class="ic">@styles</span> present) it gets its own shadow root, so the shadow-scoped
              decorators work too: <span class="ic">@styles</span>, <span class="ic">@query</span> /
              <span class="ic">@queryAll</span>, <span class="ic">@dynamicCss</span>, and the
              <span class="ic">css()</span> / <span class="ic">$()</span> helpers — same as LoomElement.
              Global (<span class="ic">:root</span>) theme variables inherit into it.
            </div>
            <div class="dec-desc">
              Only decorators tied to a host custom element don't apply:
              <span class="ic">@component</span>, <span class="ic">@slot</span>, <span class="ic">@form</span>,
              <span class="ic">@portal</span>.
            </div>
          </div>
        </section>
      </div>
    );
  }
}
