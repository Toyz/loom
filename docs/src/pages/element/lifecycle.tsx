/**
 * Lifecycle — /element/lifecycle
 *
 * @mount, @unmount, @catch_, @suspend, firstUpdated
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementLifecycle extends LoomElement {
  update() {
    return (
      <div>
        <h1>Lifecycle</h1>
        <p class="subtitle">Hooks for setup, teardown, error handling, and async loading.</p>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>@mount</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@mount</div>
            <div class="dec-desc">
              Runs when the element connects to the DOM. Multiple <span class="ic">@mount</span> methods allowed per class.
            </div>
            <code-block lang="ts" code={`@mount
setup() {
  this.shadow.adoptedStyleSheets = [styles];
  this.ctx = this.canvas.getContext("2d");
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="upload" size={20} color="var(--rose)"></loom-icon>
            <h2>@unmount</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@unmount</div>
            <div class="dec-desc">
              Runs when the element disconnects. Use for manual cleanup — cancelling timers, closing connections.
            </div>
            <code-block lang="ts" code={`@unmount
teardown() {
  cancelAnimationFrame(this.rafId);
  localStorage.setItem("state", JSON.stringify(this.state));
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--amber)"></loom-icon>
            <h2>@catch_</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@catch_(handler)</div>
            <div class="dec-desc">
              Error boundary. Class decorator that wraps <span class="ic">update()</span> and
              <span class="ic">connectedCallback()</span> with try/catch.
            </div>
            <code-block lang="ts" code={`@component("my-widget")
@catch_((err, el) => {
  el.shadow.replaceChildren(<div>{err.message}</div>);
})
class MyWidget extends LoomElement { ... }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clock" size={20} color="var(--accent)"></loom-icon>
            <h2>@suspend</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@suspend()</div>
            <div class="dec-desc">
              Async suspense. Wraps async methods to set <span class="ic">loading</span>/<span class="ic">error</span> state automatically.
            </div>
            <code-block lang="ts" code={`@reactive accessor loading = false;
@reactive accessor error: Error | null = null;

@suspend()
async fetchUser() {
  const res = await fetch(\`/api/users/\${this.userId}\`);
  this.user = await res.json();
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Combined Example</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">A component with error boundary, async loading, and cleanup:</div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>firstUpdated()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Override <span class="ic">firstUpdated()</span> for one-time setup after the first render completes.
              The shadow DOM is fully populated at this point.
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>Full Lifecycle Order</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Phase</th><th>Hook</th><th>Timing</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><code>constructor()</code></td><td>Element created</td></tr>
              <tr><td>2</td><td><code>@mount</code></td><td>Connected to DOM</td></tr>
              <tr><td>3</td><td><code>update()</code></td><td>First render</td></tr>
              <tr><td>4</td><td><code>firstUpdated()</code></td><td>After first render</td></tr>
              <tr><td>5</td><td><code>update()</code></td><td>On each @reactive change</td></tr>
              <tr><td>6</td><td><code>@unmount</code></td><td>Disconnected from DOM</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
