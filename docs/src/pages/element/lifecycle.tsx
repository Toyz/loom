/**
 * Lifecycle — /element/lifecycle
 *
 * @mount, @unmount, @catch_, @suspend, firstUpdated, shouldUpdate
 */
import { LoomElement, css, styles as applyStyles } from "@toyz/loom";

const lifecycleStyles = css`
  .lc-flow {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 1rem 0;
  }

  .lc-step {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    background: var(--bg-surface, #13131a);
    border-radius: var(--radius-sm, 6px);
    border-left: 3px solid transparent;
    transition: background 0.15s ease;
  }
  .lc-step:hover {
    background: var(--bg-hover, #1a1a24);
  }

  .lc-step.indigo  { border-left-color: var(--accent, #818cf8); }
  .lc-step.emerald { border-left-color: var(--emerald, #34d399); }
  .lc-step.amber   { border-left-color: var(--amber, #fbbf24); }
  .lc-step.cyan    { border-left-color: var(--cyan, #22d3ee); }
  .lc-step.rose    { border-left-color: var(--rose, #f472b6); }

  .lc-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 700;
    flex-shrink: 0;
  }
  .lc-step.indigo  .lc-num { background: rgba(129,140,248,0.12); color: var(--accent, #818cf8); }
  .lc-step.emerald .lc-num { background: rgba(52,211,153,0.12);  color: var(--emerald, #34d399); }
  .lc-step.amber   .lc-num { background: rgba(251,191,36,0.12);  color: var(--amber, #fbbf24); }
  .lc-step.cyan    .lc-num { background: rgba(34,211,238,0.12);  color: var(--cyan, #22d3ee); }
  .lc-step.rose    .lc-num { background: rgba(244,114,182,0.12); color: var(--rose, #f472b6); }

  .lc-hook {
    font-family: var(--font-mono, monospace);
    font-size: 0.8125rem;
    color: var(--text-primary, #e8e8f0);
    font-weight: 500;
    white-space: nowrap;
    min-width: 180px;
  }

  .lc-desc {
    font-size: 0.75rem;
    color: var(--text-muted, #5e5e74);
  }

  .lc-sep {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.125rem 0;
  }
  .lc-sep::before,
  .lc-sep::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-subtle, #1e1e2a);
  }
  .lc-sep span {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted, #5e5e74);
    white-space: nowrap;
  }
`;

@applyStyles(lifecycleStyles)
export default class PageElementLifecycle extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Lifecycle" subtitle="Hooks for setup, teardown, error handling, and async loading."></doc-header>

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
            <loom-icon name="filter" size={20} color="var(--amber)"></loom-icon>
            <h2>shouldUpdate()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Override <span class="ic">shouldUpdate()</span> to skip render cycles.
              Called before each <span class="ic">update()</span> — return <span class="ic">false</span> to
              prevent the morph. Useful for imperative components like canvas or virtual lists
              that manage their own DOM after the initial skeleton.
            </div>
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
          </div>
          <doc-notification type="note">
            Default is <span class="ic">true</span> — all components render normally unless you override this.
            Built-in elements like <span class="ic">&lt;loom-canvas&gt;</span> and <span class="ic">&lt;loom-virtual&gt;</span> use this to block re-morphing.
          </doc-notification>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>Full Lifecycle Order</h2>
          </div>

          <div class="lc-flow">
            <div class="lc-step indigo">
              <div class="lc-num">1</div>
              <span class="lc-hook">constructor()</span>
              <span class="lc-desc">Element created — shadow root attached, no DOM yet</span>
            </div>
            <div class="lc-step emerald">
              <div class="lc-num">2</div>
              <span class="lc-hook">@mount</span>
              <span class="lc-desc">Connected to DOM — setup subscriptions, adopt styles</span>
            </div>
            <div class="lc-step amber">
              <div class="lc-num">3</div>
              <span class="lc-hook">shouldUpdate()</span>
              <span class="lc-desc">Gate check — return false to skip render</span>
            </div>
            <div class="lc-step cyan">
              <div class="lc-num">4</div>
              <span class="lc-hook">update()</span>
              <span class="lc-desc">First render — return JSX, DOM is morphed</span>
            </div>
            <div class="lc-step emerald">
              <div class="lc-num">5</div>
              <span class="lc-hook">firstUpdated()</span>
              <span class="lc-desc">One-time — shadow DOM is fully populated</span>
            </div>

            <div class="lc-sep"><span>re-render loop</span></div>

            <div class="lc-step amber">
              <div class="lc-num">6</div>
              <span class="lc-hook">shouldUpdate() → update()</span>
              <span class="lc-desc">On each @reactive change — morphs only what changed</span>
            </div>

            <div class="lc-sep"><span>disconnect</span></div>

            <div class="lc-step rose">
              <div class="lc-num">7</div>
              <span class="lc-hook">@unmount</span>
              <span class="lc-desc">Disconnected from DOM — cleanup timers, close connections</span>
            </div>
          </div>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
