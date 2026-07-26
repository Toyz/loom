/**
 * Lifecycle — /element/lifecycle
 *
 * @mount, @unmount, @catch_, @suspend, firstUpdated, shouldUpdate
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementLifecycle extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Lifecycle" subtitle="Hooks for setup, teardown, errors and async loading -- and which of them run once per element rather than once per connect."></doc-header>

        <section>
          <p>The single most common lifecycle bug in web components is assuming <span class="ic">connectedCallback</span> runs once. It runs every time the element enters the DOM, and moving an element — <span class="ic">appendChild</span> to a new parent, a reorder inside a morph — disconnects and reconnects it. Setup written as "run once" silently runs three times.</p>
          <p>Loom's hooks are explicit about which side of that line they sit on. <span class="ic">@mount</span> and <span class="ic">@unmount</span> pair up per connection. <span class="ic">firstUpdated</span> runs after the first render only. <span class="ic">@suspend</span> and <span class="ic">@catch</span> wrap async work and errors so a failed load renders a state instead of a blank element.</p>
          <punch-matrix
            columns="PER CONNECT,ONCE PER ELEMENT,ASYNC-AWARE,RUNS ON ERROR"
            rows={[
              { name: "@mount", punches: "PER CONNECT", note: "After the element connects" },
              { name: "@unmount", punches: "PER CONNECT", note: "When it disconnects" },
              { name: "firstUpdated", punches: "ONCE PER ELEMENT", note: "After the first render only" },
              { name: "@suspend", punches: "PER CONNECT,ASYNC-AWARE", note: "Renders loading and error states" },
              { name: "@catch", punches: "RUNS ON ERROR", note: "Catches a throw from render or @api" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="@mount">
          <api-entry sig="@mount">
            <p>
              Runs when the element connects to the DOM. Multiple <span class="ic">@mount</span> methods allowed per class.
            </p>
            <code-block lang="ts" code={`@mount
setup() {
  this.shadow.adoptedStyleSheets = [styles];
  this.ctx = this.canvas.getContext("2d");
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="@unmount">
          <api-entry sig="@unmount">
            <p>
              Runs when the element disconnects. Use for manual cleanup — cancelling timers, closing connections.
            </p>
            <code-block lang="ts" code={`@unmount
teardown() {
  cancelAnimationFrame(this.rafId);
  localStorage.setItem("state", JSON.stringify(this.state));
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="@catch_">
          <api-entry sig="@catch_(handler)">
            <p>
              Error boundary. Class decorator that wraps <span class="ic">update()</span> and
              <span class="ic">connectedCallback()</span> with try/catch.
            </p>
            <code-block lang="ts" code={`@component("my-widget")
@catch_((err, el) => {
  el.shadow.replaceChildren(<div>{err.message}</div>);
})
class MyWidget extends LoomElement { ... }`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="@suspend">
          <api-entry sig="@suspend()">
            <p>
              Async suspense. Wraps async methods to set <span class="ic">loading</span>/<span class="ic">error</span> state automatically.
            </p>
            <code-block lang="ts" code={`@reactive accessor loading = false;
@reactive accessor error: Error | null = null;

@suspend()
async fetchUser() {
  const res = await fetch(\`/api/users/\${this.userId}\`);
  this.user = await res.json();
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="Combined Example">
            <p>A component with error boundary, async loading, and cleanup:</p>
            <code-block lang="ts" code={`@component("user-card")
@catch_((err, el) => {
  el.shadow.replaceChildren(
    <div class="error">
      <p>Failed to load user</p>
      <button onClick={() => el.fetchUser()}>Retry</button>
    </div>
  );
})
class UserCard extends LoomElement {
  @prop accessor userId!: string;
  @reactive accessor user: User | null = null;
  @reactive accessor loading = false;

  @mount
  setup() {
    this.fetchUser();
  }

  @suspend()
  async fetchUser() {
    const res = await fetch(\`/api/users/\${this.userId}\`);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    this.user = await res.json();
  }

  @unmount
  cleanup() {
    this.user = null;
  }

  update() {
    if (this.loading) return <div class="skeleton" />;
    if (!this.user) return <div>No user</div>;
    return (
      <div class="card">
        <h3>{this.user.name}</h3>
        <p>{this.user.email}</p>
      </div>
    );
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="firstUpdated()">
            <p>
              Override <span class="ic">firstUpdated()</span> for one-time setup after the first render completes.
              The shadow DOM is fully populated at this point.
            </p>
            <code-block lang="ts" code={`@component("my-el")
class MyEl extends LoomElement {
  @mount
  setup() {
    console.log("connected");
  }

  // Runs once after the first update() render
  firstUpdated() {
    this.shadow.querySelector("input")?.focus();
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="shouldUpdate()">
            <p>
              Override <span class="ic">shouldUpdate()</span> to skip render cycles.
              Called before each <span class="ic">update()</span> — return <span class="ic">false</span> to
              prevent the morph. Useful for imperative components like canvas or virtual lists
              that manage their own DOM after the initial skeleton.
            </p>
            <code-block lang="ts" code={`@component("my-canvas-wrapper")
class CanvasWrapper extends LoomElement {
  private initialized = false;

  update() {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("loom-keep", "");
    return canvas;
  }

  firstUpdated() {
    this.initialized = true;
    this.startDrawLoop();
  }

  // After the skeleton is built, skip all future morphs
  shouldUpdate(): boolean {
    return !this.initialized;
  }
}`}></code-block>
          <doc-notification type="note">
            Default is <span class="ic">true</span> — all components render normally unless you override this.
            Built-in elements like <span class="ic">&lt;loom-canvas&gt;</span> and <span class="ic">&lt;loom-virtual&gt;</span> use this to block re-morphing.
          </doc-notification>
        </doc-section>
        <doc-section heading="Full Lifecycle Order">

          <table class="api-table">
            <thead>
              <tr><th>#</th><th>Hook</th><th>When</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td><code>constructor()</code></td><td>Element created — shadow root attached, no DOM yet</td></tr>
              <tr><td>2</td><td><code>@mount</code></td><td>Connected to the DOM — set up subscriptions, adopt styles</td></tr>
              <tr><td>3</td><td><code>shouldUpdate()</code></td><td>Gate check — return false to skip the render</td></tr>
              <tr><td>4</td><td><code>update()</code></td><td>First render — return JSX, the DOM is morphed</td></tr>
              <tr><td>5</td><td><code>firstUpdated()</code></td><td>Once only — the shadow DOM is fully populated</td></tr>
              <tr><td colSpan={3} class="phase">re-render loop</td></tr>
              <tr><td>6</td><td><code>shouldUpdate() → update()</code></td><td>On each reactive change — morphs only what changed</td></tr>
              <tr><td colSpan={3} class="phase">disconnect</td></tr>
              <tr><td>7</td><td><code>@unmount</code></td><td>Disconnected — clear timers, close connections</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
